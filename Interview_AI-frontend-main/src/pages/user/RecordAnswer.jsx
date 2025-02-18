import axios from "axios";
import React, { useEffect, useState } from "react";
import useSpeechToText from "react-hook-speech-to-text";
import toast from "react-hot-toast";
import Webcam from "react-webcam";
import Loader from "../../component/Loader";
import { axiosInstance, endPoints } from "../../api/axios";
import { useNavigate } from "react-router-dom";

const RecordAnswer = ({
  mockInterviewQuestion,
  activeQuestionIndex,
  interviewData,
  setActiveQuestionIndex,
  InterviewAnswerQuestion,
  getInterviewQuestion,
}) => {
  const [userAnswer, setUserAnswer] = useState("");
  const [loader, setLoader] = useState(false);
  const [webCamEnabled, setWebCamEnabled] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isAnswerComplete, setIsAnswerComplete] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [interviewSummary, setInterviewSummary] = useState(null);
  const navigate = useNavigate();

  const currentUser = JSON.parse(localStorage.getItem("user"));

  const {
    error,
    interimResult,
    isRecording,
    results,
    setResults,
    startSpeechToText,
    stopSpeechToText,
  } = useSpeechToText({
    continuous: true,
    useLegacyResults: false,
    crossBrowser: true,
    timeout: 10000,
    speechRecognitionProperties: {
      lang: 'en-US',
      interimResults: true,
      maxAlternatives: 3,
      continuous: true,
    },
    onStartSpeaking: () => {
      console.log("Started speaking...");
      setTranscribing(true);
    },
    onStopSpeaking: () => {
      console.log("Stopped speaking...");
    },
    onError: (err) => {
      console.error("Speech recognition error:", err);
      if (err.error === 'no-speech') {
        toast.error("No speech detected. Please speak clearly into your microphone.");
      } else if (err.error === 'audio-capture') {
        toast.error("Could not start audio capture. Please check your microphone.");
      } else if (err.error === 'not-allowed') {
        toast.error("Microphone access denied. Please enable microphone permissions.");
      } else {
        toast.error("Error with speech recognition. Please check your microphone settings.");
      }
      setTranscribing(false);
    },
  });

  useEffect(() => {
    // Check for microphone permissions when component mounts
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => {
        setHasPermission(true);
      })
      .catch((err) => {
        console.error("Microphone permission error:", err);
        toast.error("Please enable microphone access to record your answer");
        setHasPermission(false);
      });
  }, []);

  useEffect(() => {
    if (results.length > 0) {
      // Combine all results with their confidence scores
      const processedResults = results
        .map((result) => ({
          transcript: result.transcript,
          confidence: result.confidence || 0.8
        }))
        .sort((a, b) => b.confidence - a.confidence); // Sort by confidence

      // Use the most confident result
      const bestResult = processedResults[0];
      
      // Combine with existing answer if there's already content
      const newAnswer = userAnswer 
        ? `${userAnswer} ${bestResult.transcript}`
        : bestResult.transcript;

      setUserAnswer(newAnswer);
      setIsAnswerComplete(newAnswer.length > 10);
      setTranscribing(true);

      // Log for debugging
      console.log("Speech recognition results:", {
        allResults: processedResults,
        bestResult,
        finalAnswer: newAnswer
      });
    }
  }, [results]);

  useEffect(() => {
    if (!isRecording && isAnswerComplete) {
      handleUpdateAnswer();
    }
  }, [isRecording, isAnswerComplete]);

  const StartStopRecording = async () => {
    if (!hasPermission) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        setHasPermission(true);
        // Keep the stream active
        window.audioStream = stream;
      } catch (err) {
        console.error("Microphone permission error:", err);
        toast.error("Please enable microphone access to record your answer");
        return;
      }
    }

    try {
      if (isRecording) {
        console.log("Stopping recording...");
        setTranscribing(false);
        stopSpeechToText();
        if (userAnswer.length < 10) {
          toast.error("Please provide a longer answer");
          return;
        }
        // Clean up audio stream
        if (window.audioStream) {
          window.audioStream.getTracks().forEach(track => track.stop());
        }
      } else {
        console.log("Starting recording...");
        setUserAnswer("");
        setResults([]);
        setIsAnswerComplete(false);
        setTranscribing(true);
        await startSpeechToText();
        toast.success("Recording started. Speak your answer clearly.");
      }
    } catch (err) {
      console.error("Recording error:", err);
      toast.error("Failed to start/stop recording. Please try again.");
      setTranscribing(false);
      // Clean up on error
      if (window.audioStream) {
        window.audioStream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const compareAnswers = (userAnswer, correctAnswer) => {
    // Convert both answers to lowercase and remove punctuation for better comparison
    const cleanText = (text) => text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
    const userText = cleanText(userAnswer);
    const correctText = cleanText(correctAnswer);

    // Split into words for keyword matching
    const userWords = new Set(userText.split(" "));
    const correctWords = new Set(correctText.split(" "));

    // Find matching and missing keywords
    const matchingWords = new Set([...userWords].filter(x => correctWords.has(x)));
    const missingWords = new Set([...correctWords].filter(x => !userWords.has(x)));

    // Calculate basic similarity score
    const similarityScore = (matchingWords.size / correctWords.size) * 10;

    return {
      matchingKeywords: Array.from(matchingWords),
      missingKeywords: Array.from(missingWords),
      similarityScore: Math.min(Math.round(similarityScore * 10) / 10, 10)
    };
  };

  const handleUpdateAnswer = async () => {
    if (!userAnswer || userAnswer.length < 10) {
      toast.error("Please provide a longer answer");
      return;
    }

    setLoader(true);
    try {
      // First, validate all required data
      if (!interviewData?.mockId) {
        throw new Error("Interview session not found");
      }

      if (!mockInterviewQuestion?.[activeQuestionIndex]?.question) {
        throw new Error("Question not found");
      }

      if (!currentUser?.email) {
        throw new Error("User not authenticated");
      }

      console.log("Processing answer for mockId:", interviewData.mockId);

      // Check if answers endpoint is accessible
      try {
        await axiosInstance.get(`${endPoints.interview.userAnswer}/${interviewData.mockId}`);
      } catch (error) {
        if (error.response?.status === 404) {
          toast.error("Answer submission endpoint not available. Please try again later.");
          return;
        }
      }

      const correctAnswer = mockInterviewQuestion[activeQuestionIndex].answer || "";
      const comparison = compareAnswers(userAnswer, correctAnswer);

      // Enhanced feedback prompt with comparison results
      const feedbackPrompt = `
        Context:
        Question: ${mockInterviewQuestion[activeQuestionIndex].question}
        Expected Answer: ${correctAnswer}
        User's Answer: ${userAnswer}

        Answer Comparison Results:
        - Similarity Score: ${comparison.similarityScore}/10
        - Matching Keywords: ${comparison.matchingKeywords.join(", ")}
        - Missing Keywords: ${comparison.missingKeywords.join(", ")}

        Please evaluate the answer based on the following criteria and provide feedback in JSON format:
        {
          "rating": ${comparison.similarityScore},
          "overallFeedback": "general feedback on the answer",
          "detailedAnalysis": {
            "relevance": {
              "score": (1-10),
              "feedback": "how well the answer addresses the question"
            },
            "completeness": {
              "score": (1-10),
              "feedback": "how thoroughly the answer covers all aspects"
            },
            "accuracy": {
              "score": (1-10),
              "feedback": "technical accuracy and correctness"
            },
            "clarity": {
              "score": (1-10),
              "feedback": "clarity and organization of the response"
            }
          },
          "keyPointsCovered": ${JSON.stringify(comparison.matchingKeywords)},
          "missingPoints": ${JSON.stringify(comparison.missingKeywords)},
          "improvements": ["specific suggestions for improvement"],
          "strengths": ["areas where the answer excelled"]
        }

        Consider:
        1. Technical accuracy and use of proper terminology
        2. Completeness of the explanation
        3. Clarity and structure of the response
        4. Practical examples or applications mentioned
        5. Alignment with industry best practices
      `;

      console.log("Requesting detailed feedback...");
      const result = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${
          import.meta.env.VITE_GEMINI_API_KEY
        }`,
        {
          contents: [{ parts: [{ text: feedbackPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        },
        {
          headers: { "Content-Type": "application/json" }
        }
      );

      let feedback;
      try {
        const responseText = result.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        console.log("Raw feedback response:", responseText);
        
        // Clean up the response text and parse JSON
        const cleanedText = responseText
          .replace(/```json\s*/g, "")
          .replace(/```/g, "")
          .trim();
        
        feedback = JSON.parse(cleanedText);
        
        if (!feedback?.rating || !feedback?.overallFeedback) {
          throw new Error("Invalid feedback format");
        }

        // Calculate weighted average score
        const detailedScores = feedback.detailedAnalysis;
        const weightedScore = Math.round(
          (detailedScores.relevance.score * 0.25 +
           detailedScores.completeness.score * 0.25 +
           detailedScores.accuracy.score * 0.25 +
           detailedScores.clarity.score * 0.25) * 10
        ) / 10;

        feedback.rating = weightedScore;
        
        // Format the feedback for better readability
        feedback.formattedFeedback = `
Overall Rating: ${feedback.rating}/10

${feedback.overallFeedback}

Detailed Analysis:
- Relevance (${detailedScores.relevance.score}/10): ${detailedScores.relevance.feedback}
- Completeness (${detailedScores.completeness.score}/10): ${detailedScores.completeness.feedback}
- Accuracy (${detailedScores.accuracy.score}/10): ${detailedScores.accuracy.feedback}
- Clarity (${detailedScores.clarity.score}/10): ${detailedScores.clarity.feedback}

Key Points Covered:
${feedback.keyPointsCovered.map(point => `• ${point}`).join('\n')}

Areas for Improvement:
${feedback.missingPoints.map(point => `• ${point}`).join('\n')}

Recommendations:
${feedback.improvements.map(point => `• ${point}`).join('\n')}

Strengths:
${feedback.strengths.map(point => `• ${point}`).join('\n')}`;

      } catch (error) {
        console.error("Error parsing feedback:", error);
        feedback = {
          rating: 5,
          feedback: "We couldn't generate specific feedback for your answer. Please ensure your response is clear, complete, and directly addresses the question."
        };
      }

      // Save the answer with improved data structure
      const answerData = {
        mockIdRef: interviewData.mockId,
        question: mockInterviewQuestion[activeQuestionIndex].question,
        correctAns: mockInterviewQuestion[activeQuestionIndex].answer || "",
        userAns: userAnswer,
        feedback: feedback.formattedFeedback || feedback.overallFeedback,
        rating: feedback.rating,
        detailedAnalysis: feedback.detailedAnalysis,
        keyPointsCovered: feedback.keyPointsCovered,
        missingPoints: feedback.missingPoints,
        improvements: feedback.improvements,
        strengths: feedback.strengths,
        userEmail: currentUser.email,
        timestamp: new Date().toISOString()
      };

      console.log("Saving answer data:", answerData);
      
      // First, check if an answer already exists for this question
      const existingAnswers = await axiosInstance.get(
        `${endPoints.interview.userAnswer}/${interviewData.mockId}`
      );
      
      const hasExistingAnswer = existingAnswers.data?.data?.some(
        answer => answer.question === answerData.question
      );

      if (hasExistingAnswer) {
        toast.error("You have already answered this question");
        return;
      }

      const saveResponse = await axiosInstance.post(
        endPoints.interview.userAnswer,
        answerData,
        {
          headers: {
            "Content-Type": "application/json"
          }
        }
      );

      if (saveResponse.data?.success) {
        console.log("Answer saved successfully");
        toast.success("Your answer has been evaluated and saved!");
        setUserAnswer("");
        setResults([]);
        setIsAnswerComplete(false);
        
        // Move to next question
        if (activeQuestionIndex < mockInterviewQuestion.length - 1) {
          setActiveQuestionIndex(prev => prev + 1);
        } else {
          // If this was the last question, show a completion message
          toast.success("Interview completed! You can now view your detailed feedback.");
        }
        
        // Refresh the question list
        await getInterviewQuestion();
      } else {
        throw new Error("Failed to save your answer");
      }
    } catch (error) {
      console.error("Error saving answer:", error);
      toast.error(error.message || "Failed to save your answer. Please try again.");
    } finally {
      setLoader(false);
      setTranscribing(false);
    }
  };

  const isQuestionAnswered = InterviewAnswerQuestion.some(
    item => item.question === mockInterviewQuestion?.[activeQuestionIndex]?.question
  );

  const handleEndInterview = async () => {
    try {
      setLoader(true);
      
      if (!interviewData?.mockId) {
        toast.error("Interview session not found");
        return;
      }

      // First verify all questions are answered
      const answersResponse = await axiosInstance.get(
        `${endPoints.interview.userAnswer}/${interviewData.mockId}`
      );

      if (!answersResponse.data?.success || !answersResponse.data?.data) {
        toast.error("No answers found. Please answer all questions before ending the interview.");
        return;
      }

      const answers = answersResponse.data.data;
      
      if (answers.length !== mockInterviewQuestion.length) {
        toast.error(`Please answer all questions (${answers.length}/${mockInterviewQuestion.length} answered)`);
        return;
      }

      // Calculate overall performance
      const totalScore = answers.reduce((sum, answer) => sum + answer.rating, 0);
      const averageScore = Math.round((totalScore / answers.length) * 10) / 10;

      // Update interview status to completed
      try {
        console.log("Updating interview status to 'Completed'");
        const updateResponse = await axiosInstance.put(
          `${endPoints.interview.update}/${interviewData.mockId}`,
          {
            status: "Completed",
            score: averageScore
          }
        );

        if (!updateResponse.data?.success) {
          throw new Error("Failed to update interview status");
        }

        // Navigate directly to feedback page instead of showing summary
        navigate(`/user/feedback/${interviewData.mockId}`);
        toast.success("Interview completed successfully!");
        
      } catch (error) {
        console.error("Error updating interview status:", error);
        toast.error("Failed to complete interview. Please try again.");
        return;
      }

    } catch (error) {
      console.error("Error completing interview:", error);
      if (error.response?.status === 404) {
        toast.error("Interview not found. Please start a new interview.");
      } else {
        toast.error(error.message || "Failed to complete interview. Please try again.");
      }
    } finally {
      setLoader(false);
    }
  };

  return (
    <div className="flex justify-center items-center flex-col">
      {webCamEnabled ? (
        <div className="relative">
          <Webcam style={{ width: "100%", height: 350 }} mirrored={true} />
          <button
            onClick={() => setWebCamEnabled(false)}
            className="absolute top-2 right-2 bg-white/80 px-3 py-1 rounded-md hover:bg-white"
          >
            Hide Camera
          </button>
        </div>
      ) : (
        <>
          <img src="/assets/webcam-clipart.jpg" className="w-60" alt="" />
          <button
            className="px-4 py-2 rounded-lg bg-[#e5f2ea] hover:bg-[#d9ece1] text-[#005151] border border-[#2a8f8f]"
            onClick={() => setWebCamEnabled(true)}
          >
            Enable Web Cam and Microphone
          </button>
        </>
      )}

      <button
        className={`bg-[#005151] border text-[white] font-semibold py-2 px-4 rounded-md mt-5 flex items-center gap-3 
          ${!hasPermission || loader || isQuestionAnswered ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#006161]'}`}
        onClick={StartStopRecording}
        disabled={!hasPermission || loader || isQuestionAnswered}
      >
        {loader ? <Loader /> : <img src="/assets/microphone-2.svg" alt="" />}
        {isQuestionAnswered
          ? "Already Answered"
          : isRecording
          ? "Stop Recording..."
          : hasPermission
          ? "Record Answer"
          : "Enable Microphone Access"}
      </button>

      <div className="mt-4 w-full max-w-md">
        {/* Current Question Display */}
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Current Question:</h3>
          <p className="text-gray-600">{mockInterviewQuestion?.[activeQuestionIndex]?.question}</p>
        </div>

        {/* Live Transcription */}
        {transcribing && interimResult && (
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <h3 className="text-sm font-semibold text-blue-700 mb-2">Live Transcription:</h3>
            <p className="text-blue-600 italic">{interimResult}</p>
          </div>
        )}

        {/* Final Answer */}
        {userAnswer && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Your Answer:</h3>
            <p className="text-gray-600">{userAnswer}</p>
          </div>
        )}
      </div>

      {/* Modify the End Interview button section */}
      {InterviewAnswerQuestion.length === mockInterviewQuestion.length && !showSummary && (
        <button
          onClick={handleEndInterview}
          className="mt-4 px-6 py-2 bg-[#005151] text-white rounded-lg hover:bg-[#006161] transition-colors"
        >
          End Interview & View Answers
        </button>
      )}
    </div>
  );
};

export default RecordAnswer;
