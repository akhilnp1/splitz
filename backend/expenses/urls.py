from django.urls import path
from .views import ExpenseListCreateView, ExpenseDetailView, RepaymentListCreateView

urlpatterns = [
    path(
        'groups/<int:group_id>/expenses/',
        ExpenseListCreateView.as_view(),
        name='expense-list-create'
    ),
    path(
        'expenses/<int:pk>/',
        ExpenseDetailView.as_view(),
        name='expense-detail'
    ),
    path(
        'groups/<int:group_id>/repayments/',
        RepaymentListCreateView.as_view(),
        name='repayment-list-create'
    ),
]