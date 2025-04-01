import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import RecipientModal from "../components/RecipientModal";
import "./Notifications.css";
import LoadingWheel from "../components/LoadingWheel";

interface NotificationItem {
  notificationId: string;
  lotId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  deleted: boolean;
  date: string;
  location: string;
  link: string | null;
  visibleBy: string;
}

interface DisplayNotification extends NotificationItem {
  id: string;
  isSelected: boolean;
}

interface LotEntry {
  lotId: string;
  notificationRecipients?: string[];
  // ... other fields
}

const Notifications: React.FC = () => {
  const { lotId } = useParams<{ lotId: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<DisplayNotification[]>([]);
  const [selectedCount, setSelectedCount] = useState(0);

  // For the image modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImageSrc, setModalImageSrc] = useState<string | null>(null);
  const [modalNotifId, setModalNotifId] = useState<string | null>(null);

  // For the recipients modal
  const [recipientModalOpen, setRecipientModalOpen] = useState(false);
  const [currentRecipients, setCurrentRecipients] = useState<string[]>([]);

  // Timer ref to mark notifications as read on the server
  const markReadTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 1) Load notifications for this lot from backend
    const fetchNotifications = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(`http://localhost:8085/ParkingWithParallel/notifications/lot/${lotId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch notifications');
        }
        const data = await response.json();
        const relevant = data
          .filter((n: NotificationItem) => !n.deleted)
          .map((n: NotificationItem, index: number) => ({
            ...n,
            id: `notif_${index}`,
            isSelected: false,
          }));
        setNotifications(relevant);

        // 2) After 4 seconds, mark all unread notifications as read on the server
        markReadTimerRef.current = setTimeout(() => {
          const unreadIds = relevant
            .filter((n: NotificationItem) => !n.read)
            .map((n: NotificationItem) => n.notificationId);
          if (unreadIds.length > 0) {
            fetch('http://localhost:8085/ParkingWithParallel/notifications/mark-read', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(unreadIds),
            }).catch(error => console.error('Error marking notifications as read:', error));
          }
        }, 4000);
      } catch (error) {
        console.error('Error fetching notifications:', error);
        setError('Failed to load lot pricing data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    // 3) Load recipients from the API
    const fetchRecipients = async () => {
      try {
        const response = await fetch(`http://localhost:8085/ParkingWithParallel/lots/${lotId}/recipients`);
        if (!response.ok) {
          throw new Error('Failed to fetch recipients');
        }
        const data = await response.json();
        setCurrentRecipients(data);
      } catch (error) {
        console.error('Error fetching recipients:', error);
        setCurrentRecipients([]);
        // Don't set the main error here as notifications are more important
      }
    };

    if (lotId) {
      fetchNotifications();
      fetchRecipients();
    }

    return () => {
      if (markReadTimerRef.current) clearTimeout(markReadTimerRef.current);
    };
  }, [lotId]);

  useEffect(() => {
    const count = notifications.filter((n) => n.isSelected).length;
    setSelectedCount(count);
  }, [notifications]);

  const toggleSelect = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((item) =>
        item.notificationId === notificationId ? { ...item, isSelected: !item.isSelected } : item
      )
    );
  };

  const handleSelectAll = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, isSelected: true })));
  };

  const handleUnselectAll = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, isSelected: false })));
  };

  const handleDismiss = async () => {
    const selectedIds = notifications
      .filter(item => item.isSelected)
      .map(item => item.notificationId);

    if (selectedIds.length === 0) return;

    try {
      // Delete each selected notification
      await Promise.all(
        selectedIds.map(id =>
          fetch(`http://localhost:8085/ParkingWithParallel/notifications/${id}`, {
            method: 'DELETE'
          })
        )
      );

      // Update local state
      setNotifications(prev =>
        prev.filter(item => !selectedIds.includes(item.notificationId))
      );
    } catch (error) {
      console.error('Error dismissing notifications:', error);
    }
  };

  const handleMarkAsRead = async () => {
    const selectedUnreadIds = notifications
      .filter(item => item.isSelected && !item.read)
      .map(item => item.notificationId);

    if (selectedUnreadIds.length === 0) return;

    try {
      const response = await fetch('http://localhost:8085/ParkingWithParallel/notifications/mark-read', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(selectedUnreadIds),
      });

      if (!response.ok) {
        throw new Error('Failed to mark notifications as read');
      }

      // Update local state to reflect the changes
      setNotifications(prev =>
        prev.map(item =>
          selectedUnreadIds.includes(item.notificationId)
            ? { ...item, read: true }
            : item
        )
      );
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const handleMarkAsUnread = async () => {
    const selectedReadIds = notifications
      .filter(item => item.isSelected && item.read)
      .map(item => item.notificationId);

    if (selectedReadIds.length === 0) return;

    try {
      const response = await fetch('http://localhost:8085/ParkingWithParallel/notifications/mark-unread', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(selectedReadIds),
      });

      if (!response.ok) {
        throw new Error('Failed to mark notifications as unread');
      }

      // Update local state to reflect the changes
      setNotifications(prev =>
        prev.map(item =>
          selectedReadIds.includes(item.notificationId)
            ? { ...item, read: false }
            : item
        )
      );
    } catch (error) {
      console.error('Error marking notifications as unread:', error);
    }
  };

  // Recipients modal controls
  const handleOpenRecipients = () => {
    setRecipientModalOpen(true);
  };
  const handleCloseRecipients = () => {
    setRecipientModalOpen(false);
  };

  const handleUpdateRecipients = async (newRecipients: string[]) => {
    setCurrentRecipients(newRecipients);
    try {
      const resp = await fetch(`http://localhost:8085/ParkingWithParallel/lots/${lotId}/recipients`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipients: newRecipients }),
      });
      if (!resp.ok) {
        console.error("Failed to update recipients on server");
      }
    } catch (err) {
      console.error("Error updating recipients:", err);
    }
  };

  const sortNotifications = (items: DisplayNotification[]) => {
    const unread = items.filter((i) => !i.read);
    const read = items.filter((i) => i.read);
    unread.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    read.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return [...unread, ...read];
  };

  const visible = sortNotifications(
    notifications.filter((n) => !n.deleted)
  );

  const handleNotificationButton = (notif: DisplayNotification) => {
    if (notif.type === "Software") {
      alert("Software update not available.");
      return;
    }
    if (notif.link && notif.link.trim()) {
      setModalImageSrc(notif.link.trim());
      setModalNotifId(notif.id);
      setModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setModalImageSrc(null);
    setModalNotifId(null);
  };

  const handleDismissFromModal = async () => {
    if (!modalNotifId) return;

    try {
      const response = await fetch(`http://localhost:8085/ParkingWithParallel/notifications/${modalNotifId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to dismiss notification');
      }

      // Update local state
      setNotifications(prev =>
        prev.filter(item => item.notificationId !== modalNotifId)
      );
      handleCloseModal();
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  const renderTopBar = () => {
    const recipientsCount = currentRecipients.length;
    if (selectedCount > 0) {
      // Get selected notifications
      const selectedNotifications = notifications.filter(n => n.isSelected);
      const allSelectedRead = selectedNotifications.every(n => n.read);
      const allSelectedUnread = selectedNotifications.every(n => !n.read);

      return (
        <div className="notif-topbar">
          <button onClick={handleUnselectAll}>Unselect All</button>
          <button onClick={handleSelectAll}>Select All</button>
          <button onClick={handleDismiss}>Dismiss</button>
          {!allSelectedRead && <button onClick={handleMarkAsRead}>Mark as Read</button>}
          {!allSelectedUnread && <button onClick={handleMarkAsUnread}>Mark as Unread</button>}
          <button className="recipients-btn" onClick={handleOpenRecipients}>
            <img src="/assets/AddPerson.svg" alt="Add Person" className="icon-person" />
            Recipients ({recipientsCount})
          </button>
        </div>
      );
    } else {
      return (
        <div className="notif-topbar">
          <button onClick={handleSelectAll}>Select All</button>
          <button className="recipients-btn" onClick={handleOpenRecipients}>
            <img src="/assets/AddPerson.svg" alt="Add Person" className="icon-person" />
            Recipients ({recipientsCount})
          </button>
        </div>
      );
    }
  };

  if (isLoading) {
    return <LoadingWheel text="Loading notifications..." />;
  }

  if (error) {
    return (
      <div className="content">
        <h1>Notification Manager</h1>
        <div className="error-container">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      <h1>Notification Manager</h1>
      {renderTopBar()}

      <table className="notif-table">
        <tbody>
          {visible.map((item) => {
            let buttonLabel = "";
            if (item.type === "Software") {
              buttonLabel = "Update";
            } else if (item.link && item.link.trim()) {
              buttonLabel = "View Image";
            }

            return (
              <tr key={item.notificationId}>
                <td className="checkbox-col">
                  <label className="custom-checkbox">
                    <input
                      type="checkbox"
                      className="hidden-checkbox"
                      checked={item.isSelected}
                      onChange={() => toggleSelect(item.notificationId)}
                    />
                    <span className="checkbox-styler"></span>
                  </label>
                </td>

                <td className="notif-info-col">
                  <div className="notif-title-row">
                    <span className="notif-title">{item.title}</span>
                    {!item.read && <span className="new-badge">NEW</span>}
                    {item.type === "VIOLATION" && <span className="violation-badge">Violation</span>}
                    <span className="notif-date-loc">
                      {new Date(item.date).toLocaleString("en-US", {
                        weekday: "short",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {item.location ? `, ${item.location}` : ""}
                    </span>
                  </div>
                  <div className="notif-message">{item.message}</div>
                </td>

                <td className="button-col">
                  {buttonLabel && (
                    <button className="link-btn" onClick={() => handleNotificationButton(item)}>
                      {buttonLabel}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Image modal using new class names */}
      {modalOpen && modalImageSrc && (
        <div className="modal-overlay">
          <div className="modal-notification-content">
            <h2>
              {visible.find((v) => v.id === modalNotifId)?.title || "Notification"}
            </h2>
            <p>
              {visible.find((v) => v.id === modalNotifId)?.message || "No message."}
            </p>
            <img src={modalImageSrc} alt="No Image Found" className="modal-image" />
            <div className="modal-buttons">
              <button className="dismiss-btn" onClick={handleDismissFromModal}>
                Dismiss Notice
              </button>
              <button className="close-btn" onClick={handleCloseModal}>
                Close Image
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recipients modal */}
      <RecipientModal
        isOpen={recipientModalOpen}
        lotId={lotId || ""}
        currentRecipients={currentRecipients}
        onClose={handleCloseRecipients}
        onUpdateRecipients={handleUpdateRecipients}
      />
    </div>
  );
};

export default Notifications;
