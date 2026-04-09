import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { getLiveSession, updateLiveSession } from '../api';
import Layout from '../components/Layout';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  Users,
  MessageSquare,
  Hand,
  Monitor,
  ChevronLeft,
  AlertCircle,
  Loader2
} from 'lucide-react';

export default function LiveMeetingPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [joined, setJoined] = useState(false);
  const [displayName, setDisplayName] = useState(user?.fullName || '');

  useEffect(() => {
    getLiveSession(sessionId)
      .then(s => {
        setSession(s);
        // Auto-start if teacher
        if (user?.role === 'TEACHER' && s.teacherId === user.id && s.status !== 'LIVE') {
          updateLiveSession(s.id, { status: 'LIVE' });
        }
      })
      .catch(err => setError(err.message || 'Session not found'))
      .finally(() => setLoading(false));
  }, [sessionId, user]);

  const handleLeave = () => {
    // Just leave the meeting, don't end it
    navigate('/live-sessions');
  };

  const handleEndCall = async () => {
    // Only teacher can end the session
    if (user?.role === 'TEACHER' && session?.teacherId === user.id) {
      await updateLiveSession(session.id, { status: 'ENDED' });
    }
    navigate('/live-sessions');
  };

  const handleJoin = () => {
    if (displayName.trim()) {
      setJoined(true);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-500">{error}</p>
          <button
            onClick={() => navigate('/live-sessions')}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg"
          >
            Back to Live Sessions
          </button>
        </div>
      </Layout>
    );
  }

  // Pre-join screen
  if (!joined) {
    return (
      <Layout>
        <div className="h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-900">
          <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Video className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-white">{session?.title}</h2>
              <p className="text-gray-400 mt-1">{session?.course?.title}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Your Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter your display name"
                />
              </div>

              <button
                onClick={handleJoin}
                disabled={!displayName.trim()}
                className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                Join Meeting
              </button>

              <button
                onClick={() => navigate('/live-sessions')}
                className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Extract room name from Jitsi URL
  const roomName = session?.meetingUrl?.split('/').pop() || 'edulms-default';

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <header className="h-14 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleLeave}
            className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-white font-medium">{session?.title}</h1>
            <p className="text-xs text-gray-400">{session?.class?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 px-2 py-1 bg-red-600 text-white text-xs font-medium rounded animate-pulse">
            <span className="w-2 h-2 bg-white rounded-full"></span>
            LIVE
          </span>
          {user?.role === 'TEACHER' && session?.teacherId === user.id && (
            <button
              onClick={handleEndCall}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg"
            >
              End Class
            </button>
          )}
        </div>
      </header>

      {/* Jitsi Meeting Container */}
      <div className="flex-1 relative">
        <iframe
          allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
          src={`https://meet.jit.si/${roomName}?config.prejoinPageEnabled=false&config.startWithAudioMuted=false&config.startWithVideoMuted=false&config.displayName=${encodeURIComponent(displayName)}&config.subject=${encodeURIComponent(session?.title || 'Live Class')}`}
          style={{ height: '100%', width: '100%', border: 'none' }}
          title="Live Class Meeting"
        />
      </div>
    </div>
  );
}
