import axios from "axios";
import React, { useState, useEffect } from "react";
import Loader from "../Loader";
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { axiosInstance, endPoints } from "../../api/axios";

const AddInterview = ({ isOpen, onClose }) => {
  const [loader, setLoader] = useState(false);
  const [jobPosition, setJobPosition] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [jobExperience, setJobExperience] = useState("");
  const navigate = useNavigate();

  // Reset form when modal is opened
  useEffect(() => {
    if (isOpen) {
      setJobPosition("");
      setJobDesc("");
      setJobExperience("");
      setLoader(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!jobPosition.trim() || !jobDesc.trim() || !jobExperience) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      setLoader(true);
      const currentUser = JSON.parse(localStorage.getItem("user"));
      
      if (!currentUser?._id) {
        toast.error("Please login to continue");
        return;
      }

      const inputPrompt = `Based on the Job Position: ${jobPosition}, Job Description: ${jobDesc}, and Years of Experience: ${jobExperience}, generate exactly 10 interview questions and their answers in the format [{"question": "Question", "answer": "Answer"}].`;

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${
          import.meta.env.VITE_GEMINI_API_KEY
        }`,
        {
          contents: [
            {
              parts: [
                {
                  text: inputPrompt,
                },
              ],
            },
          ],
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      let mockJsonResp;
      try {
        mockJsonResp = JSON.parse(
          response.data?.candidates?.[0]?.content?.parts?.[0]?.text
            .replace("```json", "")
            .replace("```", "")
            .trim()
        );

        if (!Array.isArray(mockJsonResp) || mockJsonResp.length !== 10) {
          throw new Error("Invalid question format received");
        }
      } catch (error) {
        console.error("Error parsing questions:", error);
        toast.error("Error generating interview questions. Please try again.");
        setLoader(false);
        return;
      }

      const mockId = uuidv4();
      const backendResponse = await axiosInstance.post(
        endPoints.interview.mockInterview,
        {
          jsonMockResp: JSON.stringify(mockJsonResp),
          jobPosition,
          jobDesc,
          jobExperience,
          createdBy: currentUser._id,
          mockId,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (backendResponse.data?.success) {
        toast.success("Interview created successfully!");
        onClose();
        navigate(`/user/start-interview/${mockId}`);
      } else {
        throw new Error(backendResponse.data?.message || "Failed to create interview");
      }
    } catch (error) {
      console.error("Error creating interview:", error);
      toast.error(error.message || "Error creating interview. Please try again.");
    } finally {
      setLoader(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[9999] overflow-y-auto"
      onClick={(e) => {
        // Close modal when clicking outside
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg w-full max-w-[90%] max-h-[90%] sm:w-[450px] lg:w-[500px] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">
            Tell us more about your job interview
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            type="button"
          >
            ✕
          </button>
        </div>
        <p className="mb-4">
          Add details about your job position/role, job description and year of
          experience.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="jobPosition" className="text-gray-700 font-semibold block mb-1">
              Job Role/Job Position
            </label>
            <input
              type="text"
              id="jobPosition"
              value={jobPosition}
              onChange={(e) => setJobPosition(e.target.value)}
              placeholder="Ex. Frontend Developer"
              className="input border border-gray-300 w-full rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#4DC3AB]"
              required
            />
          </div>
          <div>
            <label htmlFor="jobDesc" className="text-gray-700 font-semibold block mb-1">
              Job Description/ Tech Stack (In Short)
            </label>
            <textarea
              id="jobDesc"
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
              placeholder="Ex. React, Angular, NodeJs, MySql etc."
              className="input border border-gray-300 w-full rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#4DC3AB] min-h-[100px]"
              required
            />
          </div>
          <div>
            <label htmlFor="jobExperience" className="text-gray-700 font-semibold block mb-1">
              Years of experience
            </label>
            <input
              type="number"
              id="jobExperience"
              value={jobExperience}
              onChange={(e) => setJobExperience(e.target.value)}
              placeholder="Ex. 05"
              min="0"
              className="input border border-gray-300 w-full rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#4DC3AB]"
              required
            />
          </div>
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-[#005151] text-[#005151] bg-[#e5f2ea] hover:bg-[#d9ece1] font-semibold py-2 px-4 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loader}
              className="flex-1 border border-[#005151] text-[#005151] bg-[#e5f2ea] hover:bg-[#d9ece1] font-semibold py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loader ? <Loader /> : "Start Interview"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddInterview;
