"""
Notification service for real-time notifications using Socket.IO
"""
from extensions import socketio


def send_notification(room, event_type, data):
    """
    Send notification to specific room or user
    
    Args:
        room: Room or user ID to send notification to
        event_type: Type of notification event
        data: Notification data
    """
    try:
        socketio.emit(event_type, data, room=room)
        print(f"Notification sent to room {room}: {event_type}")
    except Exception as e:
        print(f"Failed to send notification: {e}")


def broadcast_notification(event_type, data):
    """
    Send broadcast notification to all connected clients
    
    Args:
        event_type: Type of notification event
        data: Notification data
    """
    try:
        socketio.emit(event_type, data)
        print(f"Broadcast notification sent: {event_type}")
    except Exception as e:
        print(f"Failed to broadcast notification: {e}")
