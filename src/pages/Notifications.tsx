import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import notificationsData from "../data/lot_notifications.json";
import "./Notifications.css";

interface NotificationItem {
  lotId: string;
  type: string;
  title: string;
  message: string;
  badges: string[]; 
  isRead: boolean;
  isDeleted: boolean;
  date: string;
  location: string;
  link: string; // link to image if any
}

interface DisplayNotification extends NotificationItem {
  id: string;
  isSelected: boolean;
}

const Notifications: React.FC = () => {
  const { lotId } = useParams<{ lotId: string }>();
  const [notifications, setNotifications] = useState<DisplayNotification[]>([]);
  const [selectedCount, setSelectedCount] = useState(0);

  // We'll do a 2-second timer to mark unread as read on the server
  // but keep them "NEW" in this session
  const markReadTimerRef = useRef<NodeJS.Timeout | null>(null);

  // For image modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImageSrc, setModalImageSrc] = useState<string | null>(null);
  const [modalNotifId, setModalNotifId] = useState<string | null>(null); // which notif is displayed

  useEffect(() => {
    const relevant = (notificationsData as NotificationItem[])
      .filter((n) => n.lotId === lotId && !n.isDeleted)
      .map((n, index) => ({
        ...n,
        id: `notif_${index}`,
        isSelected: false
      }));

    setNotifications(relevant);

    // after 2 seconds, update server => isRead=true
    markReadTimerRef.current = setTimeout(() => {
      markAllUnreadOnServer(relevant);
    }, 2000);

    return () => {
      if (markReadTimerRef.current) clearTimeout(markReadTimerRef.current);
    };
  }, [lotId]);

  // We'll not update local isRead => true so "NEW" badge remains visible in this session
  const markAllUnreadOnServer = async (items: DisplayNotification[]) => {
    const updated = items.map((item) =>
      !item.isRead ? { ...item, isRead: true } : item
    );
    updateNotificationsOnServer(updated);
  };

  useEffect(() => {
    const count = notifications.filter((n) => n.isSelected).length;
    setSelectedCount(count);
  }, [notifications]);

  // Toggle selection
  const toggleSelect = (id: string) => {
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isSelected: !item.isSelected } : item
      )
    );
  };

  // Select all
  const handleSelectAll = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, isSelected: true })));
  };

  // Unselect all
  const handleUnselectAll = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, isSelected: false })));
  };

  // Dismiss => isDeleted=true for selected
  const handleDismiss = () => {
    setNotifications((prev) => {
      const updated = prev.map((item) =>
        item.isSelected ? { ...item, isDeleted: true } : item
      );
      const filtered = updated.filter((item) => !item.isDeleted);
      updateNotificationsOnServer(updated);
      return filtered;
    });
  };

  // Mark as read => only on server
  const handleMarkAsRead = () => {
    setNotifications((prev) => {
      const updatedForServer = prev.map((item) =>
        item.isSelected && !item.isRead ? { ...item, isRead: true } : item
      );
      updateNotificationsOnServer(updatedForServer);
      return prev;
    });
  };

  const handleAddRecipients = () => {
    alert("Coming soon: manage recipients");
  };

  // Write changes to server
  const updateNotificationsOnServer = async (updatedList: DisplayNotification[]) => {
    const toWrite = updatedList.map((item) => ({
      lotId: item.lotId,
      type: item.type,
      title: item.title,
      message: item.message,
      badges: item.badges,
      isRead: item.isRead,
      isDeleted: item.isDeleted,
      date: item.date,
      location: item.location,
      link: item.link
    }));

    try {
      await fetch("http://localhost:5000/update-lot-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toWrite),
      });
    } catch (err) {
      console.error("Failed to update notifications on server:", err);
    }
  };

  // top bar
  const renderTopBar = () => {
    if (selectedCount > 0) {
      return (
        <div className="notif-topbar">
          <button onClick={handleUnselectAll}>Unselect All</button>
          <button onClick={handleSelectAll}>Select All</button>
          <button onClick={handleDismiss}>Dismiss</button>
          <button onClick={handleMarkAsRead}>Mark as Read</button>
          <button className="recipients-btn" onClick={handleAddRecipients}>
            + Add Recipients
          </button>
        </div>
      );
    } else {
      return (
        <div className="notif-topbar">
          <button onClick={handleSelectAll}>Select All</button>
          <button className="recipients-btn" onClick={handleAddRecipients}>
            + Add Recipients
          </button>
        </div>
      );
    }
  };

  // Sort: unread on top, then date desc
  const sortNotifications = (items: DisplayNotification[]) => {
    const unread = items.filter((i) => !i.isRead);
    const read = items.filter((i) => i.isRead);

    unread.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    read.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return [...unread, ...read];
  };

  // Filter out isDeleted
  const visible = sortNotifications(
    notifications.filter((n) => !n.isDeleted)
  );

  // Handle "button" clicks in the third column
  const handleNotificationButton = (notif: DisplayNotification) => {
    if (notif.type === "Software") {
      alert("Software update not available.");
      return;
    }
    // else if we have a link => open modal with the image
    if (notif.link && notif.link.trim()) {
      setModalImageSrc(notif.link.trim());
      setModalNotifId(notif.id);
      setModalOpen(true);
    }
  };

  // Close the modal
  const handleCloseModal = () => {
    setModalOpen(false);
    setModalImageSrc(null);
    setModalNotifId(null);
  };

  // Dismiss from the modal => isDeleted = true
  const handleDismissFromModal = () => {
    if (!modalNotifId) return;
    setNotifications((prev) => {
      const updated = prev.map((item) =>
        item.id === modalNotifId ? { ...item, isDeleted: true } : item
      );
      const filtered = updated.filter((item) => !item.isDeleted);
      updateNotificationsOnServer(updated);
      return filtered;
    });
    handleCloseModal();
  };

  return (
    <div className="content">
      <h1>Notification Manager</h1>
      {renderTopBar()}

      <table className="notif-table">
        <tbody>
          {visible.map((item) => {
            // Decide label for the button
            let buttonLabel = "";
            if (item.type === "Software") {
              buttonLabel = "Update";
            } else if (item.link && item.link.trim()) {
              buttonLabel = "View Image";
            }
            return (
              <tr key={item.id}>
                <td className="checkbox-col">
                  <label className="custom-checkbox">
                    <input
                      type="checkbox"
                      className="hidden-checkbox"
                      checked={item.isSelected}
                      onChange={() => toggleSelect(item.id)}
                    />
                    <span className="checkbox-styler"></span>
                  </label>
                </td>

                <td className="notif-info-col">
                  <div className="notif-title-row">
                    <span className="notif-title">{item.title}</span>
                    {!item.isRead && <span className="new-badge">NEW</span>}
                    {item.badges.map((b, idx) =>
                      b.trim() ? (
                        <span key={idx} className="violation-badge">
                          {b}
                        </span>
                      ) : null
                    )}
                    <span className="notif-date-loc">
                      {new Date(item.date).toLocaleString("en-US", {
                        weekday: "short",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                      {item.location ? `, ${item.location}` : ""}
                    </span>
                  </div>
                  <div className="notif-message">{item.message}</div>
                </td>

                <td className="button-col">
                  {buttonLabel && (
                    <button
                      className="link-btn"
                      onClick={() => handleNotificationButton(item)}
                    >
                      {buttonLabel}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Modal for image preview */}
      {modalOpen && modalImageSrc && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>
              {visible.find((v) => v.id === modalNotifId)?.title || "Notification"}
            </h2>
            <p>
              {
                visible.find((v) => v.id === modalNotifId)?.message ||
                "No message."
              }
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
    </div>
  );
};

export default Notifications;
