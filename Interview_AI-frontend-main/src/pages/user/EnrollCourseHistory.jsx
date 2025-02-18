import React, { useEffect, useState } from "react";
import axios from "axios";
import Pagination from "../../component/Pagination";
import PageLoader from "../../component/PageLoader";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { axiosInstance, endPoints } from "../../api/axios";

const EnrollCourseHistory = () => {
  const navigate = useNavigate();
  const [Enrollexamtable, setEnrollexamtable] = useState([]);
  const [loader, setLoader] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [roles, setRoles] = useState([]);
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [examResult, setExamResult] = useState("");
  const [laval, setLaval] = useState("");

  const fetchRoles = async () => {
    try {
      const response = await axiosInstance.get(endPoints.roles.getAll);
      setRoles(response.data.data);
    } catch (error) {
      console.error("Error fetching roles:", error);
      toast.error("Error fetching roles. Please try again.");
    }
  };

  const getEnroll = async () => {
    try {
      setLoader(true);
      
      // Check if user is logged in
      const currentUser = JSON.parse(localStorage.getItem("user"));
      if (!currentUser?._id) {
        toast.error("Please login to view your enrolled courses");
        navigate("/login");
        return;
      }

      console.log("Fetching enrolled courses...");
      const response = await axiosInstance.get(
        endPoints.enrollment.getUserCourses,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      
      console.log("Enrolled courses response:", response.data);
      
      if (response.data?.success && Array.isArray(response.data?.data)) {
        const sortedEnrollments = response.data.data.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        setEnrollexamtable(sortedEnrollments);
        
        if (sortedEnrollments.length === 0) {
          toast.info("You haven't enrolled in any courses yet.");
        } else {
          toast.success(`Found ${sortedEnrollments.length} enrolled course(s)`);
        }
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Error fetching enrolled courses:", error);
      
      if (error.response?.status === 401) {
        toast.error("Session expired. Please login again");
        navigate("/login");
        return;
      }
      
      if (error.response?.status === 404) {
        toast.info("You haven't enrolled in any courses yet.");
        setEnrollexamtable([]);
        return;
      }
      
      toast.error(error.response?.data?.message || "Failed to fetch enrolled courses. Please try again.");
    } finally {
      setLoader(false);
    }
  };

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem("user"));
    if (!currentUser?._id) {
      toast.error("Please login to view your enrolled courses");
      navigate("/login");
      return;
    }

    fetchRoles();
    getEnroll();
  }, [navigate]);

  // Filter enrollments based on search term, role, status, exam result, and level
  const filteredEnrollments = Enrollexamtable.filter((item) => {
    const matchesSearchTerm =
      item.course?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item?.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.course?.roleId?.roleName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = role ? item.course?.roleId?._id === role : true;
    const matchesStatus = status ? item?.status?.toLowerCase() === status.toLowerCase() : true;
    const matchesExamResult = examResult
      ? (item?.result?.toLowerCase() === examResult.toLowerCase()) ||
        (!item?.result && examResult.toLowerCase() === "pending")
      : true;
    const matchesLaval = laval
      ? item?.examLaval?.toLowerCase() === laval.toLowerCase()
      : true;

    return (
      matchesSearchTerm &&
      matchesRole &&
      matchesStatus &&
      matchesExamResult &&
      matchesLaval
    );
  });

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredEnrollments.slice(
    indexOfFirstItem,
    indexOfLastItem
  );

  const totalPages = Math.ceil(filteredEnrollments.length / itemsPerPage);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  return (
    <>
      <div className="border p-4 rounded-lg bg-white">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#005151]">Enrolled Courses History</h2>
          <p className="text-gray-600 mt-1">View and track your course enrollment history</p>
        </div>

        {/* Only show filters if there are enrolled courses */}
        {Enrollexamtable.length > 0 && (
          <div className="space-y-4 mb-6">
            {/* First Row: Role, Status, Exam Result, Level */}
            <div className="flex flex-wrap gap-4">
              {/* Role Dropdown */}
              <div className="flex-1 min-w-[150px]">
                <label htmlFor="role" className="block text-sm font-medium mb-1 text-gray-700">
                  Role
                </label>
                <select
                  id="role"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#4DC3AB]"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="">All Roles</option>
                  {roles.map((roleItem) => (
                    <option key={roleItem._id} value={roleItem._id}>
                      {roleItem.roleName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Dropdown */}
              <div className="flex-1 min-w-[150px]">
                <label htmlFor="status" className="block text-sm font-medium mb-1 text-gray-700">
                  Status
                </label>
                <select
                  id="status"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#4DC3AB]"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              {/* Exam Result Dropdown */}
              <div className="flex-1 min-w-[150px]">
                <label htmlFor="examResult" className="block text-sm font-medium mb-1 text-gray-700">
                  Exam Result
                </label>
                <select
                  id="examResult"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#4DC3AB]"
                  value={examResult}
                  onChange={(e) => setExamResult(e.target.value)}
                >
                  <option value="">All Results</option>
                  <option value="Pass">Pass</option>
                  <option value="Fail">Fail</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              {/* Level Dropdown */}
              <div className="flex-1 min-w-[150px]">
                <label htmlFor="laval" className="block text-sm font-medium mb-1 text-gray-700">
                  Level
                </label>
                <select
                  id="laval"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#4DC3AB]"
                  value={laval}
                  onChange={(e) => setLaval(e.target.value)}
                >
                  <option value="">All Levels</option>
                  <option value="basic">Basic</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
            </div>

            {/* Second Row: Search Input */}
            <div className="w-full md:w-1/2 lg:w-1/4">
              <label htmlFor="search" className="block text-sm font-medium mb-1 text-gray-700">
                Search
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="search"
                  placeholder="Search courses..."
                  className="w-full border rounded-lg py-2 px-4 pl-10 focus:ring-2 focus:ring-[#4DC3AB] focus:outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <img
                  src="/assets/search-Bordere.svg"
                  alt="Search"
                  className="absolute left-2 top-2.5 w-6 h-5"
                />
              </div>
            </div>
          </div>
        )}

        {/* Table Section */}
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full bg-white rounded-lg">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left text-gray-700 font-semibold">Course</th>
                <th className="p-3 text-center text-gray-700 font-semibold">Role</th>
                <th className="p-3 text-center text-gray-700 font-semibold">Status</th>
                <th className="p-3 text-center text-gray-700 font-semibold">Exam Score</th>
                <th className="p-3 text-center text-gray-700 font-semibold">Exam Result</th>
                <th className="p-3 text-center text-gray-700 font-semibold">Level</th>
                <th className="p-3 text-center text-gray-700 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {loader ? (
                <tr>
                  <td colSpan="7" className="text-center py-8">
                    <PageLoader />
                  </td>
                </tr>
              ) : currentItems.length > 0 ? (
                currentItems.map((item, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={item?.course?.courseImage || "/assets/course-placeholder.jpg"}
                          alt={item?.course?.title}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <span className="font-medium text-gray-800">
                          {item?.course?.title || "Untitled Course"}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-center text-gray-600">
                      {item.course?.roleId?.roleName || "N/A"}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-center">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            item?.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {item?.status || "N/A"}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-center">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            item.Score >= 70
                              ? "bg-green-100 text-green-800"
                              : item.Score > 0
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {item.Score ? `${item.Score}%` : "N/A"}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-center">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            item.result === "Pass"
                              ? "bg-green-100 text-green-800"
                              : item.result === "Fail"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {item.result || "Pending"}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-center text-gray-600 capitalize">
                      {item.examLaval || "N/A"}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-center">
                        {item?.status === "completed" ? (
                          <Link
                            to={`/user/enroll-exam-score/${item?._id}`}
                            className="p-2 text-[#005151] hover:bg-[#e5f2ea] rounded-full transition-colors"
                          >
                            <img src="/assets/viewbutton.svg" alt="View Score" className="w-6 h-6" />
                          </Link>
                        ) : (
                          <button
                            disabled
                            className="p-2 text-gray-400 cursor-not-allowed"
                            title="Complete the course to view score"
                          >
                            <img src="/assets/viewbutton.svg" alt="View" className="w-6 h-6 opacity-50" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-500">
                    <div className="flex flex-col items-center gap-4">
                      <p>No enrolled courses found</p>
                      <Link
                        to="/user/enroll-course"
                        className="px-4 py-2 bg-[#e5f2ea] hover:bg-[#d9ece1] text-[#005151] font-semibold rounded-md"
                      >
                        Enroll in a Course
                      </Link>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredEnrollments.length > 0 && (
          <div className="mt-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={paginate}
              setCurrentPage={setCurrentPage}
            />
          </div>
        )}
      </div>
    </>
  );
};

export default EnrollCourseHistory;
