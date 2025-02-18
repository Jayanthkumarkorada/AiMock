import axios from "axios";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { axiosInstance, endPoints } from "../../api/axios";

const ViewLiveInterview = ({ isOpen, onClose, data }) => {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  if (!isOpen) return null;

  const getTodayDate = () => {
    const localDate = new Date();
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, "0");
    const day = String(localDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getCurrentTime = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const today = getTodayDate();
  const currentTime = getCurrentTime();

  const validateDateTime = () => {
    if (!date) {
      toast.error("Please select a date");
      return false;
    }
    if (!time) {
      toast.error("Please select a time");
      return false;
    }

    const selectedDateTime = new Date(`${date}T${time}`);
    const now = new Date();

    if (selectedDateTime < now) {
      toast.error("Please select a future date and time");
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    try {
      if (!validateDateTime()) {
        return;
      }

      setIsSubmitting(true);

      // 1. Validate user session
      const token = localStorage.getItem('token');
      let currentUser;
      try {
        currentUser = JSON.parse(localStorage.getItem('user'));
      } catch (e) {
        toast.error("Invalid user session. Please login again");
        navigate('/login');
        return;
      }
      
      if (!token || !currentUser?._id) {
        toast.error("Please login to continue");
        navigate('/login');
        return;
      }

      // 2. Validate candidate data
      if (!data) {
        toast.error("No candidate data available");
        return;
      }

      // Log all relevant data for debugging
      console.log("Current User:", {
        id: currentUser._id,
        token: token ? "Present" : "Missing"
      });

      console.log("Candidate data:", {
        id: data?._id,
        email: data?.email,
        role: data?.role,
        name: `${data?.first_Name} ${data?.last_Name}`,
        userId: currentUser._id
      });

      const missingFields = [];
      if (!data._id) missingFields.push("Candidate ID");
      if (!data.email) missingFields.push("Email");
      if (!data.role) missingFields.push("Role");
      if (!data.first_Name || !data.last_Name) missingFields.push("Name");

      if (missingFields.length > 0) {
        toast.error(`Missing required fields: ${missingFields.join(", ")}`);
        return;
      }

      // 3. Format interview data
      const formattedDate = new Date(date);
      formattedDate.setHours(0, 0, 0, 0);
      const [hours, minutes] = time.split(':');
      const formattedTime = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;

      // Validate the date is not in the past
      if (formattedDate < new Date()) {
        toast.error("Please select a future date");
        return;
      }

      const interviewData = {
        interviewDate: formattedDate.toISOString().split('T')[0],
        interviewTime: formattedTime,
        candidateEmail: data.email.trim(),
        role: data.role.trim(),
        candidateId: data._id,
        candidateName: `${data.first_Name.trim()} ${data.last_Name.trim()}`,
        userId: currentUser._id,
        status: "Pending"
      };

      // Log request details
      console.log("API Configuration:", {
        baseURL: axiosInstance.defaults.baseURL,
        endpoint: endPoints.interview?.schedule,
        method: 'POST'
      });

      console.log("Request data:", {
        url: endPoints.interview.schedule,
        data: interviewData,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token.substring(0, 10)}...`
        }
      });

      // 4. Make the API call with retry logic
      let retryCount = 0;
      const maxRetries = 2;

      while (retryCount <= maxRetries) {
        try {
          const response = await axiosInstance.post(
            endPoints.interview.schedule,
            interviewData,
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              timeout: 10000 // 10 second timeout
            }
          );

          console.log("Server response:", response.data);

          if (response.data?.success) {
            toast.success("Interview scheduled successfully");
            onClose();
            navigate("/user/interview-progress");
            return;
          } else {
            throw new Error(response.data?.message || "Failed to schedule interview");
          }
        } catch (error) {
          console.error(`Attempt ${retryCount + 1} failed:`, error);
          
          if (error.response?.status === 401) {
            toast.error("Session expired. Please login again");
            navigate('/login');
            return;
          }

          if (error.response?.status === 409) {
            toast.error("An interview is already scheduled for this candidate");
            return;
          }

          if (error.response?.status === 500) {
            if (retryCount < maxRetries) {
              retryCount++;
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
              continue;
            }
            toast.error("Server is temporarily unavailable. Please try again in a few minutes");
            return;
          }

          if (error.code === 'ECONNABORTED') {
            toast.error("Request timed out. Please check your internet connection");
            return;
          }

          if (!error.response) {
            toast.error("Network error. Please check your internet connection");
            return;
          }

          throw error;
        }
      }
    } catch (error) {
      console.error("Interview scheduling failed:", {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });

      toast.error("Unable to schedule interview. Please try again later");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white w-full max-w-md overflow-auto p-6 shadow-lg relative rounded-lg">
        <div className="flex flex-col h-full">
          <h2 className="text-2xl font-semibold mb-4">Schedule Live Interview</h2>
          
          {data && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Candidate: {data.first_Name} {data.last_Name}</p>
              <p className="text-sm text-gray-600">Email: {data.email}</p>
              <p className="text-sm text-gray-600">Role: {data.role}</p>
            </div>
          )}

          <div className="flex space-x-4">
            <div className="flex flex-col w-1/2">
              <label htmlFor="date" className="text-gray-700 font-medium mb-2">
                Date: <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="date"
                className="border rounded px-3 py-2 focus:outline-none focus:ring focus:ring-[#4DC3AB]"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={today}
                required
              />
            </div>
            <div className="flex flex-col w-1/2">
              <label htmlFor="time" className="text-gray-700 font-medium mb-2">
                Time: <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                id="time"
                className="border rounded px-3 py-2 focus:outline-none focus:ring focus:ring-[#4DC3AB]"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                min={date === today ? currentTime : undefined}
                required
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 focus:outline-none w-full"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSubmitting}
              className={`px-4 py-2 text-[#005151] bg-[#e5f2ea] border-[#005151] border rounded focus:outline-none w-full ${
                isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#d9ece1]'
              }`}
            >
              {isSubmitting ? 'Scheduling...' : 'Schedule Interview'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewLiveInterview;
