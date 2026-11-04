"""
Admin Panel Views (Strict Direct SQL - NO ORM)
Manages Turf Owner Verifications, Approvals, Rejections, Suspensions, and Audit Logs.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from utilities.permissions import IsAdminUserRole
from database.connection import query_all, query_one, execute_update, db_cursor

def mask_bank_account(account_number: str) -> str:
    """Masks bank account number showing only the last 4 digits."""
    if not account_number or len(account_number) < 4:
        return "********"
    return "X" * (len(account_number) - 4) + account_number[-4:]

class AdminDashboardStatsView(APIView):
    """Provides key metrics for the Admin Dashboard."""
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        stats = {}
        # Owner metrics
        owner_counts = query_all(
            """
            SELECT account_status, COUNT(*) as count
            FROM owners
            WHERE is_deleted = FALSE
            GROUP BY account_status;
            """
        )
        stats["owners_by_status"] = {row["account_status"]: row["count"] for row in owner_counts}
        stats["pending_owners"] = stats["owners_by_status"].get("Pending Approval", 0)
        stats["approved_owners"] = stats["owners_by_status"].get("Approved", 0)
        stats["rejected_owners"] = stats["owners_by_status"].get("Rejected", 0)
        stats["suspended_owners"] = stats["owners_by_status"].get("Suspended", 0)
        stats["total_owners"] = sum(stats["owners_by_status"].values())

        # Turfs and Bookings metrics
        turf_count = query_one("SELECT COUNT(*) as count FROM turfs WHERE is_deleted = FALSE;")
        stats["total_turfs"] = turf_count["count"] if turf_count else 0

        booking_counts = query_all(
            """
            SELECT status, COUNT(*) as count
            FROM booking_requests
            GROUP BY status;
            """
        )
        stats["bookings_by_status"] = {row["status"]: row["count"] for row in booking_counts}
        stats["total_bookings"] = sum(stats["bookings_by_status"].values())

        return Response(stats)

class AdminOwnersListView(APIView):
    """
    List owners with filtering:
    account_status, state_id, city_id, owner_type, registered date range, and search.
    """
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        params = request.query_params
        account_status = params.get("status")
        state_id = params.get("state_id")
        city_id = params.get("city_id")
        owner_type = params.get("owner_type")
        search = params.get("search", "").strip()
        start_date = params.get("start_date")
        end_date = params.get("end_date")
        sort_by = params.get("sort_by", "newest")

        sql = """
            SELECT 
                o.id, o.user_id, o.full_name, o.brand_name, o.mobile, o.gst_number,
                o.bank_account_number, o.bank_ifsc, o.id_proof_type, o.owner_type,
                o.sports_offered, o.date_of_birth, o.id_proof_file, o.business_proof_file,
                o.verification_id_proof, o.verification_ownership_proof, o.verification_bank_details,
                o.rejection_category, o.rejection_reason, o.admin_note, o.account_status,
                o.created_at, u.email,
                s.name as state_name, c.name as city_name,
                (SELECT COUNT(*) FROM turfs t WHERE t.owner_id = o.id AND t.is_deleted = FALSE) as turf_count
            FROM owners o
            JOIN users u ON o.user_id = u.id
            LEFT JOIN states s ON o.state_id = s.id
            LEFT JOIN cities c ON o.city_id = c.id
            WHERE o.is_deleted = FALSE
        """
        sql_params = []

        if account_status and account_status != "All":
            sql += " AND o.account_status = %s"
            sql_params.append(account_status)
        if state_id:
            sql += " AND o.state_id = %s"
            sql_params.append(int(state_id))
        if city_id:
            sql += " AND o.city_id = %s"
            sql_params.append(int(city_id))
        if owner_type and owner_type != "All":
            sql += " AND o.owner_type = %s"
            sql_params.append(owner_type)
        if start_date:
            sql += " AND o.created_at >= %s"
            sql_params.append(start_date)
        if end_date:
            sql += " AND o.created_at <= %s"
            sql_params.append(end_date)
        if search:
            sql += """ AND (
                o.full_name ILIKE %s OR 
                o.brand_name ILIKE %s OR 
                u.email ILIKE %s OR 
                o.mobile ILIKE %s
            )"""
            pattern = f"%{search}%"
            sql_params.extend([pattern, pattern, pattern, pattern])

        if sort_by == "oldest":
            sql += " ORDER BY o.created_at ASC"
        else:
            sql += " ORDER BY o.created_at DESC"

        owners = query_all(sql, sql_params)
        for o in owners:
            o["masked_bank_account"] = mask_bank_account(o["bank_account_number"])

        return Response({"owners": owners})

class AdminOwnerDetailView(APIView):
    """Detailed view for a specific owner including audit trail."""
    permission_classes = [IsAdminUserRole]

    def get(self, request, owner_id):
        owner = query_one(
            """
            SELECT 
                o.id, o.user_id, o.full_name, o.brand_name, o.mobile, o.gst_number,
                o.bank_account_number, o.bank_ifsc, o.id_proof_type, o.owner_type,
                o.sports_offered, o.date_of_birth, o.id_proof_file, o.business_proof_file,
                o.verification_id_proof, o.verification_ownership_proof, o.verification_bank_details,
                o.rejection_category, o.rejection_reason, o.admin_note, o.account_status,
                o.created_at, o.updated_at, u.email,
                s.name as state_name, c.name as city_name, co.name as country_name
            FROM owners o
            JOIN users u ON o.user_id = u.id
            LEFT JOIN states s ON o.state_id = s.id
            LEFT JOIN cities c ON o.city_id = c.id
            LEFT JOIN countries co ON o.country_id = co.id
            WHERE o.id = %s;
            """,
            (owner_id,)
        )
        if not owner:
            return Response({"error": "Owner not found."}, status=status.HTTP_404_NOT_FOUND)

        owner["masked_bank_account"] = mask_bank_account(owner["bank_account_number"])

        # Fetch Audit Logs for this owner
        audit_logs = query_all(
            """
            SELECT a.id, a.action, a.previous_status, a.new_status, a.reason_or_note, a.created_at,
                   u.email as admin_email, adm.full_name as admin_name
            FROM admin_audit_logs a
            LEFT JOIN users u ON a.admin_id = u.id
            LEFT JOIN admins adm ON a.admin_id = adm.user_id
            WHERE a.target_owner_id = %s
            ORDER BY a.created_at DESC;
            """,
            (owner_id,)
        )

        # Fetch Turfs for this owner
        turfs = query_all(
            """
            SELECT t.id, t.name, t.sport, t.surface, t.size, t.weekday_price_per_hour, t.weekend_price_per_hour,
                   t.status, t.is_deleted, t.created_at, s.name as state_name, c.name as city_name,
                   (SELECT COUNT(*) FROM booking_requests br WHERE br.turf_id = t.id AND br.status = 'Approved' AND br.booking_date >= CURRENT_DATE) as upcoming_bookings_count
            FROM turfs t
            LEFT JOIN states s ON t.state_id = s.id
            LEFT JOIN cities c ON t.city_id = c.id
            WHERE t.owner_id = %s AND t.is_deleted = FALSE
            ORDER BY t.created_at DESC;
            """,
            (owner_id,)
        )

        return Response({
            "owner": owner,
            "turfs": turfs,
            "audit_logs": audit_logs
        })

class AdminVerifyOwnerView(APIView):
    """
    Approves an owner.
    Enforces the verification checklist:
    ID proof, ownership proof, and bank details MUST ALL be verified before approve is allowed!
    """
    permission_classes = [IsAdminUserRole]

    def post(self, request, owner_id):
        data = request.data
        def to_bool(val):
            if isinstance(val, bool):
                return val
            return str(val).lower() in ("true", "1", "yes")

        verify_id = to_bool(data.get("verification_id_proof"))
        verify_ownership = to_bool(data.get("verification_ownership_proof"))
        verify_bank = to_bool(data.get("verification_bank_details"))
        admin_note = (data.get("admin_note") or "").strip()[:250]

        if not (verify_id and verify_ownership and verify_bank):
            return Response({
                "error": "All 3 verification checklist items (ID proof, ownership proof, and bank details) must be verified before approval."
            }, status=status.HTTP_400_BAD_REQUEST)

        owner = query_one("SELECT id, user_id, account_status, brand_name FROM owners WHERE id = %s", (owner_id,))
        if not owner:
            return Response({"error": "Owner not found."}, status=status.HTTP_404_NOT_FOUND)

        prev_status = owner["account_status"]

        with db_cursor(as_dict=True) as cur:
            cur.execute(
                """
                UPDATE owners
                SET account_status = 'Approved',
                    verification_id_proof = TRUE,
                    verification_ownership_proof = TRUE,
                    verification_bank_details = TRUE,
                    admin_note = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s;
                """,
                (admin_note, owner_id)
            )

            # Update users table status
            cur.execute("UPDATE users SET status = 'Approved', updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (owner["user_id"],))

            # Audit log
            cur.execute(
                """
                INSERT INTO admin_audit_logs (admin_id, target_owner_id, action, previous_status, new_status, reason_or_note)
                VALUES (%s, %s, 'APPROVE_OWNER', %s, 'Approved', %s);
                """,
                (request.user.id, owner_id, prev_status, admin_note or "Checklist verified successfully.")
            )

            # In-app notification for owner
            cur.execute(
                """
                INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
                VALUES (%s, 'Account Approved!', 'Congratulations! Your turf owner account has been approved by the platform administrator. You can now add turfs and manage slots.', 'ACCOUNT_APPROVED', %s, 'owner');
                """,
                (owner["user_id"], owner_id)
            )

        return Response({"message": f"Owner {owner['brand_name']} approved successfully.", "account_status": "Approved"})

class AdminRejectOwnerView(APIView):
    """
    Rejects an owner registration.
    Requires rejection category and reason (max 250 chars).
    Allowed categories: Invalid ID Proof, Invalid Ownership Proof, Incorrect Bank Details, Incomplete Details, Other
    """
    permission_classes = [IsAdminUserRole]

    def post(self, request, owner_id):
        data = request.data
        category = data.get("rejection_category", "").strip()
        reason = data.get("rejection_reason", "").strip()

        allowed_categories = [
            "Invalid ID Proof",
            "Invalid Ownership Proof",
            "Incorrect Bank Details",
            "Incomplete Details",
            "Other"
        ]
        if category not in allowed_categories:
            return Response({"error": f"Invalid rejection category. Choose from: {', '.join(allowed_categories)}"}, status=status.HTTP_400_BAD_REQUEST)
        if not reason:
            return Response({"error": "Rejection reason is required (up to 250 characters)."}, status=status.HTTP_400_BAD_REQUEST)
        if len(reason) > 250:
            return Response({"error": "Rejection reason cannot exceed 250 characters."}, status=status.HTTP_400_BAD_REQUEST)

        owner = query_one("SELECT id, user_id, account_status, brand_name FROM owners WHERE id = %s", (owner_id,))
        if not owner:
            return Response({"error": "Owner not found."}, status=status.HTTP_404_NOT_FOUND)

        prev_status = owner["account_status"]

        with db_cursor(as_dict=True) as cur:
            cur.execute(
                """
                UPDATE owners
                SET account_status = 'Rejected',
                    rejection_category = %s,
                    rejection_reason = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s;
                """,
                (category, reason, owner_id)
            )
            cur.execute("UPDATE users SET status = 'Rejected', updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (owner["user_id"],))

            cur.execute(
                """
                INSERT INTO admin_audit_logs (admin_id, target_owner_id, action, previous_status, new_status, reason_or_note)
                VALUES (%s, %s, 'REJECT_OWNER', %s, 'Rejected', %s);
                """,
                (request.user.id, owner_id, prev_status, f"[{category}] {reason}")
            )

            cur.execute(
                """
                INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
                VALUES (%s, 'Account Application Rejected', %s, 'ACCOUNT_REJECTED', %s, 'owner');
                """,
                (owner["user_id"], f"Your turf owner registration was not approved. Reason: [{category}] {reason}", owner_id)
            )

        return Response({"message": f"Owner {owner['brand_name']} rejected.", "account_status": "Rejected"})

class AdminToggleSuspendOwnerView(APIView):
    """
    Toggles Suspend / Reactivate for approved owners.
    Suspending automatically hides all their turfs from player search and stops new requests.
    """
    permission_classes = [IsAdminUserRole]

    def post(self, request, owner_id):
        reason = request.data.get("reason", "").strip() or "Admin action"
        owner = query_one("SELECT id, user_id, account_status, brand_name FROM owners WHERE id = %s", (owner_id,))
        if not owner:
            return Response({"error": "Owner not found."}, status=status.HTTP_404_NOT_FOUND)

        current_status = owner["account_status"]
        if current_status not in ("Approved", "Suspended"):
            return Response({"error": "Only Approved or Suspended owners can have their status toggled."}, status=status.HTTP_400_BAD_REQUEST)

        new_status = "Suspended" if current_status == "Approved" else "Approved"
        action_name = "SUSPEND_OWNER" if new_status == "Suspended" else "REACTIVATE_OWNER"

        with db_cursor(as_dict=True) as cur:
            cur.execute(
                "UPDATE owners SET account_status = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;",
                (new_status, owner_id)
            )
            cur.execute("UPDATE users SET status = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (new_status, owner["user_id"]))

            # Log decision
            cur.execute(
                """
                INSERT INTO admin_audit_logs (admin_id, target_owner_id, action, previous_status, new_status, reason_or_note)
                VALUES (%s, %s, %s, %s, %s, %s);
                """,
                (request.user.id, owner_id, action_name, current_status, new_status, reason)
            )

            notification_msg = (
                f"Your account has been suspended by the platform administrator. Turfs are hidden from search. Reason: {reason}"
                if new_status == "Suspended"
                else "Your account has been reactivated. Your turfs are once again visible to players."
            )
            cur.execute(
                """
                INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
                VALUES (%s, %s, %s, %s, %s, 'owner');
                """,
                (owner["user_id"], f"Account {new_status}", notification_msg, f"ACCOUNT_{new_status.upper()}", owner_id)
            )

        return Response({
            "message": f"Owner {owner['brand_name']} status changed to {new_status}.",
            "account_status": new_status
        })

class AdminBulkActionView(APIView):
    """Bulk Approve or Reject owners."""
    permission_classes = [IsAdminUserRole]

    def post(self, request):
        owner_ids = request.data.get("owner_ids", [])
        action = request.data.get("action")  # 'approve' or 'reject'
        reason = request.data.get("reason", "").strip() or "Bulk admin action"
        category = request.data.get("rejection_category", "Other")

        if not owner_ids or not isinstance(owner_ids, list):
            return Response({"error": "Provide a list of owner_ids."}, status=status.HTTP_400_BAD_REQUEST)

        if action not in ("approve", "reject"):
            return Response({"error": "Action must be 'approve' or 'reject'."}, status=status.HTTP_400_BAD_REQUEST)

        updated_count = 0
        target_status = "Approved" if action == "approve" else "Rejected"
        log_action = "BULK_APPROVE" if action == "approve" else "BULK_REJECT"

        with db_cursor(as_dict=True) as cur:
            for oid in owner_ids:
                owner = query_one("SELECT user_id, account_status FROM owners WHERE id = %s", (oid,))
                if not owner:
                    continue

                if action == "approve":
                    cur.execute(
                        """
                        UPDATE owners
                        SET account_status = 'Approved',
                            verification_id_proof = TRUE,
                            verification_ownership_proof = TRUE,
                            verification_bank_details = TRUE,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s;
                        """,
                        (oid,)
                    )
                else:
                    cur.execute(
                        """
                        UPDATE owners
                        SET account_status = 'Rejected',
                            rejection_category = %s,
                            rejection_reason = %s,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s;
                        """,
                        (category, reason, oid)
                    )

                cur.execute("UPDATE users SET status = %s WHERE id = %s;", (target_status, owner["user_id"]))
                cur.execute(
                    """
                    INSERT INTO admin_audit_logs (admin_id, target_owner_id, action, previous_status, new_status, reason_or_note)
                    VALUES (%s, %s, %s, %s, %s, %s);
                    """,
                    (request.user.id, oid, log_action, owner["account_status"], target_status, reason)
                )
                updated_count += 1

        return Response({"message": f"Successfully processed {updated_count} owners with status {target_status}."})

class AdminAuditLogsView(APIView):
    """List administrative audit decisions."""
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        logs = query_all(
            """
            SELECT a.id, a.action, a.previous_status, a.new_status, a.reason_or_note, a.created_at,
                   u.email as admin_email, adm.full_name as admin_name,
                   o.brand_name as owner_brand, o.full_name as owner_name, o.id as owner_id
            FROM admin_audit_logs a
            LEFT JOIN users u ON a.admin_id = u.id
            LEFT JOIN admins adm ON a.admin_id = adm.user_id
            LEFT JOIN owners o ON a.target_owner_id = o.id
            ORDER BY a.created_at DESC
            LIMIT 200;
            """
        )
        return Response({"audit_logs": logs})

class AdminSoftDeleteOwnerView(APIView):
    """
    Soft-deletes an owner while preserving existing player bookings.
    Notifies all players who have active bookings under this owner's turfs.
    Records admin audit log and deactivates associated owner user account.
    """
    permission_classes = [IsAdminUserRole]

    def post(self, request, owner_id):
        reason = (request.data.get("reason") or "Soft-deleted by Administrator").strip()
        owner = query_one("SELECT id, user_id, brand_name, account_status, is_deleted FROM owners WHERE id = %s;", (owner_id,))
        if not owner or owner.get("is_deleted"):
            return Response({"error": "Owner not found or already deleted."}, status=status.HTTP_404_NOT_FOUND)

        prev_status = owner["account_status"]

        # Find all players with active or pending bookings under this owner's turfs
        affected_bookings = query_all(
            """
            SELECT DISTINCT p.user_id as player_user_id, p.full_name as player_name,
                   br.id as booking_id, br.booking_reference, br.booking_date, t.name as turf_name
            FROM booking_requests br
            JOIN turfs t ON br.turf_id = t.id
            JOIN players p ON br.player_id = p.id
            WHERE t.owner_id = %s AND br.booking_date >= CURRENT_DATE AND br.status IN ('Approved', 'Pending');
            """,
            (owner_id,)
        )

        with db_cursor(as_dict=True) as cur:
            # 1. Soft-delete owner
            cur.execute(
                """
                UPDATE owners
                SET is_deleted = TRUE, account_status = 'Suspended', admin_note = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s;
                """,
                (f"[DELETED] {reason}", owner_id)
            )

            # 2. Deactivate associated owner user account
            cur.execute(
                "UPDATE users SET is_deleted = TRUE, status = 'Inactive', updated_at = CURRENT_TIMESTAMP WHERE id = %s;",
                (owner["user_id"],)
            )

            # 3. Turfs under him are set to Inactive to prevent new bookings, but preserved for existing bookings
            cur.execute(
                "UPDATE turfs SET status = 'Inactive', updated_at = CURRENT_TIMESTAMP WHERE owner_id = %s;",
                (owner_id,)
            )

            # 4. Notify affected players regarding the venue ownership update
            for b in affected_bookings:
                cur.execute(
                    """
                    INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
                    VALUES (%s, %s, %s, 'VENUE_UPDATE', %s, 'booking');
                    """,
                    (
                        b["player_user_id"],
                        f"Notice: {b['turf_name']}",
                        f"Notice regarding your booking {b['booking_reference']} on {b['booking_date']} at {b['turf_name']}: The facility management has been updated by administration. Your booking details remain safely recorded.",
                        b["booking_id"]
                    )
                )

            # 5. Insert Audit Log
            cur.execute(
                """
                INSERT INTO admin_audit_logs (admin_id, target_owner_id, action, previous_status, new_status, reason_or_note)
                VALUES (%s, %s, 'DELETE_OWNER', %s, 'Deleted', %s);
                """,
                (request.user.id, owner_id, prev_status, f"{reason} | {len(affected_bookings)} player(s) notified")
            )

        return Response({
            "message": f"Owner '{owner['brand_name']}' deleted. Registered turfs preserved as inactive, and {len(affected_bookings)} affected player(s) have been notified."
        })
