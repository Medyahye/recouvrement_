from django.urls import path

from .views import ConversationChatView, ConversationListCreateView, ConversationMessagesView

urlpatterns = [
    path("conversations/", ConversationListCreateView.as_view()),
    path("conversations/<uuid:conversation_id>/messages/", ConversationMessagesView.as_view()),
    path("conversations/<uuid:conversation_id>/chat/", ConversationChatView.as_view()),
]
