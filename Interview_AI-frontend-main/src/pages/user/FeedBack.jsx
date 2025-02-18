import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { axiosInstance, endPoints } from '../../api/axios'

const FeedBack = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [questionsAndAnswers, setQuestionsAndAnswers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchQuestionsAndAnswers = async () => {
      try {
        setLoading(true)
        setError(null)
        console.log("Fetching interview data for:", id)
        
        if (!id) {
          throw new Error("Invalid interview ID")
        }

        // Get the interview data
        let interviewData;
        try {
          console.log("Fetching interview data from:", `${endPoints.interview.mockInterview}/${id}`)
          const interviewResponse = await axiosInstance.get(`${endPoints.interview.mockInterview}/${id}`)
          
          if (!interviewResponse.data?.success) {
            throw new Error("Interview not found")
          }
          interviewData = interviewResponse.data.data
        } catch (error) {
          console.error("Error fetching interview:", error)
          throw new Error("Failed to fetch interview data")
        }

        // Parse questions and answers from interview data
        let questions;
        try {
          questions = JSON.parse(interviewData.jsonMockResp)
          if (!Array.isArray(questions)) {
            throw new Error("Invalid question format")
          }

          // Map questions to include both question and expected answer
          const formattedQuestions = questions.map(q => ({
            question: q.question,
            expectedAnswer: q.answer || "No answer provided"
          }))

          setQuestionsAndAnswers(formattedQuestions)
          toast.success("Interview questions loaded successfully!")
          
        } catch (error) {
          console.error("Error parsing questions:", error)
          throw new Error("Failed to parse interview questions")
        }
        
      } catch (error) {
        console.error("Error in fetching data:", error)
        setError(error.message || "Failed to fetch interview data")
        toast.error(error.message || "Failed to fetch interview data")
      } finally {
        setLoading(false)
      }
    }

    fetchQuestionsAndAnswers()
  }, [id])

  const handleBackToInterviews = () => {
    navigate('/user/live-interview')
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#005151]"></div>
        <p className="mt-4 text-gray-600">Loading interview questions...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={handleBackToInterviews}
          className="px-4 py-2 bg-[#e5f2ea] hover:bg-[#d9ece1] text-[#005151] font-semibold rounded-md"
        >
          Back to Interviews
        </button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Success Banner */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                Interview Completed Successfully!
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#005151]">Interview Questions & Expected Answers</h2>
        <button
          onClick={handleBackToInterviews}
          className="px-4 py-2 bg-[#e5f2ea] hover:bg-[#d9ece1] text-[#005151] font-semibold rounded-md"
        >
          Back to Interviews
        </button>
      </div>

      <div className="space-y-6">
        {questionsAndAnswers.map((item, index) => (
          <div
            key={index}
            className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200"
          >
            <div className="p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Question {index + 1}:
                </h3>
                <p className="text-gray-700">{item.question}</p>
              </div>
              
              <div className="mt-4">
                <h4 className="font-medium text-gray-700 mb-2">Expected Answer:</h4>
                <p className="text-gray-600 bg-gray-50 p-4 rounded-lg">
                  {item.expectedAnswer}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default FeedBack
