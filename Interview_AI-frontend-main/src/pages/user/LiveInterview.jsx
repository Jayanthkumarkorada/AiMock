import React, { useState } from "react";
import AddInterview from "../../component/models/AddInterview";
import InterviewList from "./InterviewList";
import toast from "react-hot-toast";

const LiveInterview = () => {
  const [addInterview, setAddInterview] = useState(false);

  const handleAddNew = () => {
    const currentUser = JSON.parse(localStorage.getItem("user"));
    if (!currentUser?._id) {
      toast.error("Please login to continue");
      return;
    }
    setAddInterview(true);
  };

  const handleCloseModal = () => {
    setAddInterview(false);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          className="p-6 border rounded-lg bg-white hover:shadow-lg cursor-pointer transition-all duration-300 transform hover:-translate-y-1"
          onClick={handleAddNew}
        >
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 bg-[#e5f2ea] rounded-full flex items-center justify-center">
              <span className="text-2xl text-[#005151] font-bold">+</span>
            </div>
            <h2 className="text-lg font-semibold text-[#005151]">Add New Interview</h2>
            <p className="text-gray-500 text-center text-sm">
              Create a new AI-powered interview session
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <InterviewList key={addInterview ? 'updated' : 'initial'} />
      </div>

      {addInterview && (
        <AddInterview
          isOpen={addInterview}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default LiveInterview;
