import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import notificationsData from "../data/lot_notifications.json";
import lotsData from "../data/lots_master.json";
import RecipientModal from "../components/RecipientModal";
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
  link: string;
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
    // 1) Load notifications for this lot
    const relevant = (notificationsData as NotificationItem[])
      .filter((n) => n.lotId === lotId && !n.isDeleted)
      .map((n, index) => ({
        ...n,
        id: `notif_${index}`,
        isSelected: false,
      }));
    setNotifications(relevant);

    // 2) After 2 seconds, mark all unread notifications as read on the server.
    markReadTimerRef.current = setTimeout(() => {
      markAllUnreadOnServer(relevant);
    }, 2000);

    // 3) Load recipients from lots_master
    const matchingLot = (lotsData as LotEntry[]).find((lot) => lot.lotId === lotId);
    if (matchingLot && matchingLot.notificationRecipients) {
      setCurrentRecipients(matchingLot.notificationRecipients);
    } else {
      setCurrentRecipients([]);
    }

    return () => {
      if (markReadTimerRef.current) clearTimeout(markReadTimerRef.current);
    };
  }, [lotId]);

  // Mark notifications as read on the server (local isRead remains unchanged)
  const markAllUnreadOnServer = async (items: DisplayNotification[]) => {
    const updated = items.map((item) =>
      item.isRead ? item : { ...item, isRead: true }
    );
    updateNotificationsOnServer(updated);
  };

  useEffect(() => {
    const count = notifications.filter((n) => n.isSelected).length;
    setSelectedCount(count);
  }, [notifications]);

  const toggleSelect = (id: string) => {
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isSelected: !item.isSelected } : item
      )
    );
  };

  const handleSelectAll = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, isSelected: true })));
  };

  const handleUnselectAll = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, isSelected: false })));
  };

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

  const handleMarkAsRead = () => {
    setNotifications((prev) => {
      const updatedForServer = prev.map((item) =>
        item.isSelected && !item.isRead ? { ...item, isRead: true } : item
      );
      updateNotificationsOnServer(updatedForServer);
      return prev;
    });
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
      const resp = await fetch("http://localhost:5000/update-lot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lotId,
          updatedData: { notificationRecipients: newRecipients },
        }),
      });
      if (!resp.ok) {
        console.error("Failed to update recipients on server");
      }
    } catch (err) {
      console.error("Error updating recipients:", err);
    }
  };

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
      link: item.link,
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

  const sortNotifications = (items: DisplayNotification[]) => {
    const unread = items.filter((i) => !i.isRead);
    const read = items.filter((i) => i.isRead);
    unread.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    read.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return [...unread, ...read];
  };

  const visible = sortNotifications(
    notifications.filter((n) => !n.isDeleted)
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

  const renderTopBar = () => {
    const recipientsCount = currentRecipients.length;
    if (selectedCount > 0) {
      return (
        <div className="notif-topbar">
          <button onClick={handleUnselectAll}>Unselect All</button>
          <button onClick={handleSelectAll}>Select All</button>
          <button onClick={handleDismiss}>Dismiss</button>
          <button onClick={handleMarkAsRead}>Mark as Read</button>
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
