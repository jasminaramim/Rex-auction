"use client";

import { useContext, useState, useRef, useEffect, useMemo } from "react";
import {
  FiBell,
  FiInfo,
  FiChevronLeft,
  FiChevronRight,
  FiEdit,
  FiTrash,
} from "react-icons/fi";
import "./Announcement.css";
import LoadingSpinner from "../../LoadingSpinner";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate, useLocation } from "react-router-dom";
import ThemeContext from "../../Context/ThemeContext";
import io from "socket.io-client";
import useAuth from "../../../hooks/useAuth";
import useAxiosPublic from "../../../hooks/useAxiosPublic";
import { useGetAnnouncementsQuery } from "../../../redux/features/api/announcementApi";
import EditAnnouncementModal from "../admin/EditAnnouncementModal";

const Announcement = () => {
  const {
    data: announcements,
    isLoading,
    refetch,
  } = useGetAnnouncementsQuery();
  const { isDarkMode } = useContext(ThemeContext);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const socketRef = useRef(null);
  const location = useLocation();
  const [notificationDetails, setNotificationDetails] = useState(null);
  const [allNotifications, setAllNotifications] = useState([]);
  const [notificationUsers, setNotificationUsers] = useState({});
  const [notificationFilter, setNotificationFilter] = useState("all");
  const [notificationCount, setNotificationCount] = useState(0);
  const axiosPublic = useAxiosPublic();
  const [userRole, setUserRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);

  // Fetch user role from database
  useEffect(() => {
    const fetchUserRole = async () => {
      if (user?.email) {
        try {
          setRoleLoading(true);
          const response = await axiosPublic.get(`/users?email=${user.email}`, {
            withCredentials: true,
          });
          if (response.data && response.data.length > 0) {
            setUserRole(response.data[0].role);
          } else {
            setUserRole("buyer");
            toast.error("User not found. Defaulting to buyer role.");
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          setUserRole("buyer");
          toast.error("Failed to fetch user role. Defaulting to buyer role.");
        } finally {
          setRoleLoading(false);
        }
      }
    };

    fetchUserRole();
  }, [user, axiosPublic]);

  // Memoize isAdmin to prevent recalculations
  const isAdmin = useMemo(() => userRole === "admin", [userRole]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [totalPages, setTotalPages] = useState(1);

  // Calculate total pages
  useEffect(() => {
    if (announcements && announcements.length > 0) {
      setTotalPages(Math.ceil(announcements.length / itemsPerPage));
      if (currentPage > Math.ceil(announcements.length / itemsPerPage)) {
        setCurrentPage(1);
      }
    }
  }, [announcements, itemsPerPage, currentPage]);

  // Get current announcements for pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAnnouncements =
    announcements?.slice(indexOfFirstItem, indexOfLastItem) || [];

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

  // Adjust items per page based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setItemsPerPage(3);
      } else if (window.innerWidth < 1024) {
        setItemsPerPage(6);
      } else {
        setItemsPerPage(9);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Check for incoming notification data from route state
  useEffect(() => {
    if (location.state?.notificationDetails) {
      setNotificationDetails(location.state.notificationDetails);
      setIsNotificationModalOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Initialize socket connection
  useEffect(() => {
    if (!user) return;

    const socket = io("https://rex-auction-server-side-jzyx.onrender.com", {
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on("receiveNotification", (notification) => {
      console.log(
        "New notification received in Announcement component:",
        notification
      );
      setAllNotifications((prev) => [notification, ...prev]);
      setNotificationCount((prev) => prev + 1);
      toast.success(notification.title, { description: notification.message });

      if (
        notification.type === "announcement" &&
        notification.announcementData
      ) {
        setNotificationDetails(notification);
        setIsNotificationModalOpen(true);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  // Fetch all notifications on component mount
  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchUsers();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const response = await axiosPublic.get(`/notifications/${user.email}`, {
        withCredentials: true,
      });

      if (response.data) {
        setAllNotifications(response.data);
        const unreadCount = response.data.filter((n) => !n.read).length;
        setNotificationCount(unreadCount);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast.error("Failed to fetch notifications.");
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axiosPublic.get("/users");
      if (response.data) {
        const userMap = {};
        response.data.forEach((user) => {
          userMap[user.email] = user;
        });
        setNotificationUsers(userMap);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch user data.");
    }
  };

  const handlePostAnnouncement = async (announcementData) => {
    try {
      const response = await axios.post(
        "https://rex-auction-server-side-jzyx.onrender.com/announcement",
        {
          title: announcementData.title,
          content: announcementData.content,
          date: announcementData.date || new Date().toISOString(),
          image: announcementData.image || "/placeholder.svg",
        }
      );
      if (response.status === 201) {
        toast.success("Announcement posted successfully!");
        refetch();
        setIsNotificationModalOpen(false);
        setNotificationDetails(null);
      }
    } catch (error) {
      toast.error("Failed to post announcement. Please try again.");
      console.error("Error posting announcement:", error);
    }
  };

  const handleEdit = (announcement, e) => {
    e.stopPropagation();
    setSelectedAnnouncement(announcement);
    setIsModalOpen(true);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      const response = await axios.delete(
        `https://rex-auction-server-side-jzyx.onrender.com/announcement/${id}`
      );
      if (response.status === 200) {
        toast.success("Announcement deleted successfully!");
        refetch();
      }
    } catch (error) {
      toast.error("Failed to delete the announcement. Please try again.");
    }
  };

  const sendAnnouncementNotification = (announcement, e) => {
    e.stopPropagation();
    if (!socketRef.current || !socketRef.current.connected) {
      toast.error("Socket connection not available. Cannot send notification.");
      return;
    }

    const notificationData = {
      type: "announcement",
      title: `New Announcement: ${announcement.title}`,
      message:
        announcement.content.substring(0, 100) +
        (announcement.content.length > 100 ? "..." : ""),
      announcementData: {
        _id: announcement._id,
        title: announcement.title,
        content: announcement.content,
        date: announcement.date,
        image: announcement.image,
      },
      sender: user?.email,
      recipient: "all",
      timestamp: new Date(),
      read: false,
    };

    socketRef.current.emit("sendNotification", notificationData, (response) => {
      if (response && response.success) {
        toast.success("Announcement notification sent to all users");
      } else {
        toast.error("Failed to send announcement notification");
      }
    });
  };

  const viewNotificationDetails = (notification) => {
    setNotificationDetails(notification);
    setIsNotificationModalOpen(true);

    if (!notification.read) {
      setNotificationCount((prev) => Math.max(0, prev - 1));
    }

    setAllNotifications((prev) =>
      prev.map((n) => (n._id === notification._id ? { ...n, read: true } : n))
    );

    axios
      .put(
        `https://rex-auction-server-side-jzyx.onrender.com/notifications/mark-read/${user.email}`,
        { notificationId: notification._id },
        { withCredentials: true }
      )
      .catch((error) => {
        console.error("Error marking notification as read:", error);
        toast.error("Failed to mark notification as read.");
      });
  };

  const getUserDetails = (email) => {
    if (!email || email === "all")
      return { name: "All Users", photo: "/placeholder.svg" };
    return (
      notificationUsers[email] || { name: email, photo: "/placeholder.svg" }
    );
  };

  const navigateToAnnouncementDetails = (notification) => {
    if (notification.announcementData?._id) {
      navigate(`/announcementDetails/${notification.announcementData._id}`, {
        state: { notificationDetails: notification },
      });
      setIsNotificationModalOpen(false);
    } else {
      toast.error("Announcement details not available");
    }
  };

  const navigateToPayment = (auctionData) => {
    navigate(`/dashboard/payment`, { state: { auctionData } });
    setIsNotificationModalOpen(false);
  };

  const markAllNotificationsAsRead = async () => {
    try {
      setAllNotifications((prev) =>
        prev.map((notif) => ({ ...notif, read: true }))
      );
      setNotificationCount(0);

      if (user) {
        await axios.put(
          `https://rex-auction-server-side-jzyx.onrender.com/notifications/mark-read/${user.email}`,
          {},
          { withCredentials: true }
        );
        toast.success("All notifications marked as read");
      }
    } catch (error) {
      console.error("Error marking notifications as read:", error);
      toast.error("Failed to mark notifications as read");
    }
  };

  const getFilteredNotifications = () => {
    if (notificationFilter === "all") return allNotifications;
    if (notificationFilter === "unread")
      return allNotifications.filter((n) => !n.read);
    return allNotifications.filter((n) => n.type === notificationFilter);
  };

  const filteredNotifications = getFilteredNotifications();

  // Validate and format dates
  const formatDateRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      return `${start.toLocaleDateString()} - ${end.toLocaleDateString()} (Invalid: End date before start date)`;
    }
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  };

  if (isLoading || roleLoading) return <LoadingSpinner />;

  return (
    <div
      className={`px-4 md:px-8 py-10 ${
        isDarkMode ? "bg-gray-900 text-white" : "bg-purple-50 text-gray-800"
      } min-h-screen`}
    >
      {/* Notifications Section */}
      <div className="mb-8">
        <div
          className={`${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } rounded-xl shadow-md overflow-hidden`}
        >
          <div
            className={`p-6 border-b ${
              isDarkMode ? "border-gray-700" : "border-gray-200"
            }`}
          >
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FiBell className="text-purple-500" />
                Announcements
                {notificationCount > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-semibold text-white bg-red-500 rounded-full animate-pulse">
                    {notificationCount > 9 ? "9+" : notificationCount}
                  </span>
                )}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={markAllNotificationsAsRead}
                  className={`text-xs px-2 py-1 rounded ${
                    isDarkMode
                      ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                  title="Mark all as read"
                >
                  Mark all as read
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              <button
                onClick={() => setNotificationFilter("all")}
                className={`px-3 py-1 text-xs rounded-full ${
                  notificationFilter === "all"
                    ? isDarkMode
                      ? "bg-purple-600 text-white"
                      : "bg-purple-100 text-purple-700"
                    : isDarkMode
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setNotificationFilter("unread")}
                className={`px-3 py-1 text-xs rounded-full ${
                  notificationFilter === "unread"
                    ? isDarkMode
                      ? "bg-purple-600 text-white"
                      : "bg-purple-100 text-purple-700"
                    : isDarkMode
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Unread
              </button>
              <button
                onClick={() => setNotificationFilter("announcement")}
                className={`px-3 py-1 text-xs rounded-full ${
                  notificationFilter === "announcement"
                    ? isDarkMode
                      ? "bg-purple-600 text-white"
                      : "bg-purple-100 text-purple-700"
                    : isDarkMode
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Announcements
              </button>
              <button
                onClick={() => setNotificationFilter("auction-win")}
                className={`px-3 py-1 text-xs rounded-full ${
                  notificationFilter === "auction-win"
                    ? isDarkMode
                      ? "bg-purple-600 text-white"
                      : "bg-purple-100 text-purple-700"
                    : isDarkMode
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Auction Wins
              </button>
            </div>
          </div>

          <div>
            {filteredNotifications.length > 0 ? (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`p-4 transition-colors cursor-pointer ${
                      notification.read
                        ? isDarkMode
                          ? "bg-gray-800 hover:bg-gray-700"
                          : "bg-white hover:bg-gray-200"
                        : isDarkMode
                        ? "bg-gray-700/50 hover:bg-gray-600"
                        : "bg-purple-100/50 hover:bg-gray-200"
                    }`}
                    onClick={() => viewNotificationDetails(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <img
                          src={
                            getUserDetails(notification.sender).photo ||
                            "/placeholder.svg"
                          }
                          alt="Sender"
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h4
                            className={`font-semibold truncate ${
                              !notification.read ? "font-bold" : ""
                            }`}
                          >
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <span className="inline-block w-2 h-2 bg-purple-500 rounded-full ml-2 mt-2"></span>
                          )}
                        </div>
                        <p className="text-sm mt-1 line-clamp-2">
                          {notification.message}
                        </p>

                        <div className="flex justify-between items-center mt-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                notification.type === "announcement"
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                  : notification.type === "auction-win"
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                                  : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                              }`}
                            >
                              {notification.type === "auction-win"
                                ? "Auction Win"
                                : notification.type}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(notification.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FiInfo className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-gray-500">No notifications found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Announcements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentAnnouncements.map((item) => (
          <div
            key={item._id}
            className={`relative rounded-xl overflow-hidden shadow-lg transform transition-transform duration-300 hover:scale-105 ${
              isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"
            }`}
          >
            {/* Image with Gradient Overlay */}
            <div className="relative">
              <img
                src={item.files?.[0]?.url || "/placeholder.svg"}
                alt={item.title}
                className="w-full h-48 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <div className="absolute bottom-4 left-4">
                <h2 className="text-xl font-bold text-white drop-shadow-lg">
                  {item.title}
                </h2>
              </div>
              {isAdmin && (
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    onClick={(e) => handleEdit(item, e)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium text-sm transition ${
                      isDarkMode
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-blue-500 hover:bg-blue-600 text-white"
                    }`}
                    title="Edit announcement"
                    aria-label="Edit announcement"
                  >
                    <FiEdit /> Edit
                  </button>
                  <button
                    onClick={(e) => handleDelete(item._id, e)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium text-sm transition ${
                      isDarkMode
                        ? "bg-red-600 hover:bg-red-700 text-white"
                        : "bg-red-500 hover:bg-red-600 text-white"
                    }`}
                    title="Delete announcement"
                    aria-label="Delete announcement"
                  >
                    <FiTrash /> Delete
                  </button>
                </div>
              )}
            </div>

            {/* Card Content */}
            <div className="p-4">
              <p
                className={`text-sm ${
                  isDarkMode ? "text-gray-300" : "text-gray-600"
                } mb-2`}
              >
                {formatDateRange(item.startDate, item.endDate)}
              </p>
              <p
                className={`text-sm ${
                  isDarkMode ? "text-gray-300" : "text-gray-600"
                } line-clamp-2`}
              >
                {item.content}
              </p>
              <p
                className={`text-xs ${
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                } mt-2`}
              >
                Target Audience: {item.targetAudience}
              </p>
            </div>

            {/* Notify Button (Admin Only) and Read More */}
            <div className="p-4 pt-0 flex justify-between items-center">
              {isAdmin && (
                <button
                  onClick={(e) => sendAnnouncementNotification(item, e)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium text-sm transition ${
                    isDarkMode
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-green-500 hover:bg-green-600 text-white"
                  }`}
                  title="Send as notification"
                  aria-label="Send announcement as notification"
                >
                  <FiBell /> Notify
                </button>
              )}
              <button
                onClick={() => navigate(`/announcementDetails/${item._id}`)}
                className="px-4 py-1.5 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition"
              >
                Read More →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Simple Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <div className="flex items-center space-x-2">
            <button
              onClick={prevPage}
              disabled={currentPage === 1}
              className={`p-2 rounded-md ${
                currentPage === 1
                  ? "opacity-50 cursor-not-allowed"
                  : isDarkMode
                  ? "bg-gray-700 hover:bg-gray-600 text-white"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-700"
              }`}
              aria-label="Previous page"
            >
              <FiChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex space-x-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (number) => (
                  <button
                    key={number}
                    onClick={() => paginate(number)}
                    className={`w-8 h-8 flex items-center justify-center rounded-md ${
                      currentPage === number
                        ? isDarkMode
                          ? "bg-purple-600 text-white"
                          : "bg-purple-600 text-white"
                        : isDarkMode
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {number}
                  </button>
                )
              )}
            </div>

            <button
              onClick={nextPage}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-md ${
                currentPage === totalPages
                  ? "opacity-50 cursor-not-allowed"
                  : isDarkMode
                  ? "bg-gray-700 hover:bg-gray-600 text-white"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-700"
              }`}
              aria-label="Next page"
            >
              <FiChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Notification Details Modal */}
      {isNotificationModalOpen && notificationDetails && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className={`${
              isDarkMode
                ? "bg-gray-800 text-gray-100"
                : "bg-white text-gray-800"
            } rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col`}
          >
            <div className="flex justify-between items-center p-6 pb-0">
              <div className="flex items-center space-x-3">
                <div
                  className={`p-2 rounded-lg ${
                    notificationDetails.type === "announcement"
                      ? "bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-300"
                      : "bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-300"
                  }`}
                >
                  {notificationDetails.type === "announcement" ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  )}
                </div>
                <h3 className="text-2xl font-bold">Notification Details</h3>
              </div>
              <button
                onClick={() => setIsNotificationModalOpen(false)}
                className={`p-2 rounded-full ${
                  isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                } transition-colors`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto p-6 pt-4 flex-1">
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    className={`p-4 rounded-lg ${
                      isDarkMode ? "bg-gray-700/50" : "bg-gray-50"
                    }`}
                  >
                    <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-1">
                      Title
                    </h4>
                    <p className="text-lg font-medium">
                      {notificationDetails.title}
                    </p>
                  </div>
                  <div
                    className={`p-4 rounded-lg ${
                      isDarkMode ? "bg-gray-700/50" : "bg-gray-50"
                    }`}
                  >
                    <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-1">
                      Sender
                    </h4>
                    <p className="text-lg font-medium">
                      {notificationDetails.sender}
                    </p>
                  </div>
                </div>

                <div
                  className={`p-4 rounded-lg ${
                    isDarkMode ? "bg-gray-700/50" : "bg-gray-50"
                  }`}
                >
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-1">
                    Message
                  </h4>
                  <p className="whitespace-pre-line">
                    {notificationDetails.message}
                  </p>
                </div>

                <div
                  className={`p-4 rounded-lg ${
                    isDarkMode ? "bg-gray-700/50" : "bg-gray-50"
                  }`}
                >
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-1">
                    Received
                  </h4>
                  <p className="flex items-center space-x-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>
                      {new Date(notificationDetails.timestamp).toLocaleString()}
                    </span>
                  </p>
                </div>

                {notificationDetails.type === "auction" &&
                  notificationDetails.auctionData && (
                    <div
                      className={`mt-6 border-t pt-6 ${
                        isDarkMode ? "border-gray-700" : "border-gray-200"
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="p-2 bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-300 rounded-lg">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <h4 className="text-xl font-bold text-green-600 dark:text-green-400">
                          Auction You Won
                        </h4>
                      </div>

                      <div
                        className={`rounded-xl overflow-hidden shadow-lg ${
                          isDarkMode ? "bg-gray-700" : "bg-gray-100"
                        }`}
                      >
                        <div className="relative">
                          {notificationDetails.auctionData.images?.length >
                          0 ? (
                            <div className="h-64 w-full overflow-hidden">
                              <img
                                src={
                                  notificationDetails.auctionData.images[0] ||
                                  "/placeholder.svg"
                                }
                                alt={notificationDetails.auctionData.name}
                                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-5">
                                <h5 className="text-3xl font-bold text-white drop-shadow-lg">
                                  {notificationDetails.auctionData.name}
                                </h5>
                              </div>
                            </div>
                          ) : (
                            <div className="h-64 w-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-16 w-16 text-gray-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                            </div>
                          )}
                          <div className="absolute top-4 right-4 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                            Winner: You!
                          </div>
                          <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                            {notificationDetails.auctionData.category}
                          </div>
                        </div>

                        <div className="p-6 space-y-6">
                          <div>
                            <h6 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              Description
                            </h6>
                            <p className="mt-1 text-gray-300">
                              {notificationDetails.auctionData.description ||
                                "No description available."}
                            </p>
                          </div>
                          <div>
                            <h6 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              Bidding History
                            </h6>
                            <p className="mt-1 text-gray-300">
                              {notificationDetails.auctionData.history ||
                                "No bidding history available."}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h6 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Winning Bid
                              </h6>
                              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                                $
                                {notificationDetails.auctionData.currentBid?.toLocaleString() ||
                                  "N/A"}
                              </p>
                            </div>
                            <div>
                              <h6 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Starting Price
                              </h6>
                              <p className="mt-1 font-medium">
                                $
                                {notificationDetails.auctionData.startingPrice?.toLocaleString() ||
                                  "N/A"}
                              </p>
                            </div>
                            <div>
                              <h6 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Start Time
                              </h6>
                              <p className="mt-1 font-medium">
                                {notificationDetails.auctionData.startTime
                                  ? new Date(
                                      notificationDetails.auctionData.startTime
                                    ).toLocaleString()
                                  : "N/A"}
                              </p>
                            </div>
                            <div>
                              <h6 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                End Time
                              </h6>
                              <p className="mt-1 font-medium">
                                {notificationDetails.auctionData.endTime
                                  ? new Date(
                                      notificationDetails.auctionData.endTime
                                    ).toLocaleString()
                                  : "N/A"}
                              </p>
                            </div>
                            <div>
                              <h6 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Condition
                              </h6>
                              <p className="mt-1 font-medium">
                                {notificationDetails.auctionData.condition ||
                                  "N/A"}
                              </p>
                            </div>
                            <div>
                              <h6 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Item Year
                              </h6>
                              <p className="mt-1 font-medium">
                                {notificationDetails.auctionData.itemYear ||
                                  "N/A"}
                              </p>
                            </div>
                            <div>
                              <h6 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Total Bids
                              </h6>
                              <p className="mt-1 font-medium">
                                {notificationDetails.auctionData.bids || 0}
                              </p>
                            </div>
                            <div>
                              <h6 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Status
                              </h6>
                              <p className="mt-1 font-medium">
                                {notificationDetails.auctionData.status ||
                                  "N/A"}
                              </p>
                            </div>
                          </div>

                          <div>
                            <h6 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                              Seller Information
                            </h6>
                            <div className="flex items-center space-x-4 p-4 rounded-lg bg-white dark:bg-gray-600">
                              <div className="w-12 h-12 rounded-full overflow-hidden">
                                <img
                                  src={
                                    notificationDetails.auctionData
                                      .sellerPhotoUrl || "/placeholder.svg"
                                  }
                                  alt={
                                    notificationDetails.auctionData
                                      .sellerDisplayName
                                  }
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div>
                                <p className="font-medium">
                                  {
                                    notificationDetails.auctionData
                                      .sellerDisplayName
                                  }
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {notificationDetails.auctionData.sellerEmail}
                                </p>
                              </div>
                            </div>
                          </div>

                          {notificationDetails.auctionData.images?.length >
                            1 && (
                            <div>
                              <h6 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                                Additional Photos
                              </h6>
                              <div className="grid grid-cols-3 gap-2">
                                {notificationDetails.auctionData.images
                                  .slice(1)
                                  .map((img, index) => (
                                    <img
                                      key={index}
                                      src={img || "/placeholder.svg"}
                                      alt={`Auction item ${index + 2}`}
                                      className="w-full h-24 object-cover rounded-lg hover:scale-105 transition-transform duration-300"
                                    />
                                  ))}
                              </div>
                            </div>
                          )}

                          {notificationDetails.auctionData.topBidders?.length >
                            0 && (
                            <div>
                              <h6 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                                Top Bidders
                              </h6>
                              <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-300 dark:border-gray-600">
                                {notificationDetails.auctionData.topBidders.map(
                                  (bidder, index) => (
                                    <div
                                      key={index}
                                      className={`flex justify-between items-center p-3 text-sm ${
                                        index % 2 === 0
                                          ? isDarkMode
                                            ? "bg-gray-600/30"
                                            : "bg-white"
                                          : isDarkMode
                                          ? "bg-gray-700"
                                          : "bg-gray-50"
                                      }`}
                                    >
                                      <span className="font-medium">
                                        {bidder.bidder || "Unknown"}
                                      </span>
                                      <span className="text-green-600 dark:text-green-400">
                                        $
                                        {bidder.amount?.toLocaleString() ||
                                          "N/A"}
                                      </span>
                                      <span className="text-gray-500 dark:text-gray-400">
                                        {bidder.timestamp
                                          ? new Date(
                                              bidder.timestamp
                                            ).toLocaleTimeString()
                                          : "N/A"}
                                      </span>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                          <div>
                            <h6 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                              Bidding History
                            </h6>
                            <p className="p-3 text-gray-700 dark:text-gray-300 rounded-lg bg-white dark:bg-gray-600">
                              {notificationDetails.auctionData.history ||
                                "No bidding history available."}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            </div>

            <div
              className={`p-4 border-t ${
                isDarkMode
                  ? "border-gray-700 bg-gray-800"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              <div className="flex flex-wrap justify-end gap-3">
                {isAdmin && notificationDetails.type === "announcement" && (
                  <>
                    <button
                      onClick={() =>
                        handlePostAnnouncement(
                          notificationDetails.announcementData
                        )
                      }
                      className={`px-5 py-2 rounded-lg font-medium flex items-center space-x-2 ${
                        notificationDetails.announcementData?._id
                          ? "bg-gray-300 text-gray-600 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed"
                          : "bg-purple-600 text-white hover:bg-purple-700"
                      } transition-colors`}
                      disabled={notificationDetails.announcementData?._id}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                        />
                      </svg>
                      <span>
                        {notificationDetails.announcementData?._id
                          ? "Already Posted"
                          : "Post Announcement"}
                      </span>
                    </button>
                    {notificationDetails.announcementData?._id && (
                      <button
                        onClick={() => {
                          navigate(
                            `/announcementDetails/${notificationDetails.announcementData._id}`
                          );
                          setIsNotificationModalOpen(false);
                        }}
                        className="px-5 py-2 bg-white border border-purple-600 text-purple-600 hover:bg-purple-50 dark:bg-gray-800 dark:border-purple-500 dark:text-purple-400 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
                      >
                        View Details
                      </button>
                    )}
                  </>
                )}
                {notificationDetails.type === "auction" && (
                  <button
                    onClick={() =>
                      navigateToPayment(notificationDetails.auctionData)
                    }
                    className="px-5 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg font-medium flex items-center space-x-2 transition-colors shadow-md hover:shadow-lg"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                      />
                    </svg>
                    <span>Proceed to Payment</span>
                  </button>
                )}
                <button
                  onClick={() => setIsNotificationModalOpen(false)}
                  className="px-5 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Announcement Modal */}
      {isAdmin && (
        <EditAnnouncementModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          announcementData={selectedAnnouncement}
          refetch={refetch}
        />
      )}
    </div>
  );
};

export default Announcement;
