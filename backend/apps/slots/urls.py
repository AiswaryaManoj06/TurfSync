from django.urls import path
from .views import SlotsListView, CreateSlotsView, BlockSlotView, UnblockSlotView, DeleteSlotView

urlpatterns = [
    path("", SlotsListView.as_view(), name="slots_list"),
    path("create/", CreateSlotsView.as_view(), name="slots_create"),
    path("block/", BlockSlotView.as_view(), name="slots_block"),
    path("<int:slot_id>/unblock/", UnblockSlotView.as_view(), name="slots_unblock"),
    path("<int:slot_id>/delete/", DeleteSlotView.as_view(), name="slots_delete"),
]
