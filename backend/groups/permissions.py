from rest_framework.permissions import BasePermission
from .models import GroupMembership


class IsGroupMember(BasePermission):
    """Allows access only to members of the group."""
    message = "You are not a member of this group."

    def has_object_permission(self, request, view, obj):
        return GroupMembership.objects.filter(
            user=request.user, group=obj
        ).exists()


class IsGroupAdmin(BasePermission):
    """Allows full access only to group admins."""
    message = "You must be a group admin to perform this action."

    def has_object_permission(self, request, view, obj):
        return GroupMembership.objects.filter(
            user=request.user, group=obj, is_admin=True
        ).exists()