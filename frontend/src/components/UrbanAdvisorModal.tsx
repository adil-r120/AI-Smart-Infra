import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Sparkles, X, Terminal, ArrowRight, Save, Clock, BrainCircuit } from 'lucide-react';
import './UrbanAdvisorModal.css';

const API_BASE = "http://127.0.0.1:8000";

interface UrbanAdvisorProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BriefingData {
  status: string;
  briefing: string;
  recommendations: string[];
  generated_at: string;
}

const UrbanAdvisorModal: React.FC<UrbanAdvisorProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BriefingData | null>(null);
  const [displayText, setDisplayText] = useState("");
  const [index, setIndex] = useState(0);
  const [cachedData, setCachedData] = useState<BriefingData | null>(null);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  useEffect(() => {
    if (isOpen) {
      // Check if we have valid cached data
      const cached = localStorage.getItem('briefing_cache');
      if (cached) {
        const { data: cachedBriefing, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          // Use cached data for instant display
          setCachedData(cachedBriefing);
          setData(cachedBriefing);
          setLoading(false);
          // Still fetch fresh data in background
          fetchBriefing(true);
          return;
        }
      }
      fetchBriefing();
    } else {
      setDisplayText("");
      setIndex(0);
      // Don't clear data on close to keep cache
    }
  }, [isOpen]);

  const fetchBriefing = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/analytics/briefing`, {
        timeout: 8000 // 8 second timeout to prevent hanging
      });
      let briefingContent = res.data.briefing;
      
      if (typeof briefingContent === 'object' && briefingContent !== null) {
        briefingContent = briefingContent.content || JSON.stringify(briefingContent);
      }
      
      const briefingData = { ...res.data, briefing: String(briefingContent) };
      setData(briefingData);
      
      // Cache the data
      localStorage.setItem('briefing_cache', JSON.stringify({
        data: briefingData,
        timestamp: Date.now()
      }));
      
      setLoading(false);
    } catch (err) {
      console.error("Error fetching briefing:", err);
      // If we have cached data, use it on error
      if (cachedData) {
        setData(cachedData);
      }
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    if (data && typeof data.briefing === 'string' && index < data.briefing.length) {
      const timeout = setTimeout(() => {
        setDisplayText((prev) => prev + data.briefing[index]);
        setIndex((prev) => prev + 1);
      }, 5); // Reduced from 12ms to 5ms for faster display
      return () => clearTimeout(timeout);
    }
  }, [data, index]);

  if (!isOpen) return null;

  return (
    <div className="uam-overlay">
      <div className="uam-modal">
        
        {/* Header Section */}
        <header className="uam-header">
          <div className="uam-header-left">
            <div className="uam-icon-box">
              <BrainCircuit size={28} />
            </div>
            <div>
              <h2 className="uam-title">Urban AI Resilience Report</h2>
              <div className="uam-subtitle">
                <Clock size={12} /> 
                {loading ? "ESTABLISHING NEURAL LINK..." : (data?.generated_at?.toUpperCase() || "SYNCHRONIZING...")}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="uam-close-btn" title="Close Briefing">
            <X size={20} />
          </button>
        </header>

        {/* Content Body */}
        <main className="uam-body custom-scrollbar">
          {loading ? (
            <div className="uam-loader-container">
              <div className="uam-spinner"></div>
              <p style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>Analyzing Infrastructure Telemetry...</p>
            </div>
          ) : (
            <div className="animate-in">
              
              {/* Status Indicator */}
              <div className={`uam-status-badge ${
                data?.status === 'Healthy' ? 'healthy' :
                data?.status === 'Critical' ? 'critical' : 'warning'
              }`}>
                {data?.status} STATUS
              </div>

              {/* Narrative Analysis */}
              <div className="uam-narrative-container">
                <div className="uam-narrative-accent"></div>
                <p className="uam-narrative-text">
                  {displayText}
                  {data && index < data.briefing.length && <span className="uam-cursor"></span>}
                </p>
              </div>

              {/* Actionable Recommendations */}
              <section className="uam-intel-card">
                <div className="uam-intel-header">
                  <Terminal size={14} /> Actionable Recommendations
                </div>
                <ul className="uam-rec-list">
                  {data?.recommendations.map((rec, i) => (
                    <li key={i} className="uam-rec-item">
                      <div className="uam-rec-dot"></div>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Branding */}
              <footer className="uam-branding">
                <div className="uam-branding-line"></div>
                <span className="uam-branding-text">Smart-Infra</span>
                <div className="uam-branding-line"></div>
              </footer>

            </div>
          )}
        </main>

        {/* Action Footer */}
        <footer className="uam-footer">
          <button className="uam-btn uam-btn-ghost" onClick={() => window.print()}>
            <Save size={18} /> Export Report
          </button>
          <button className="uam-btn uam-btn-primary" onClick={onClose}>
            Acknowledge Report <ArrowRight size={18} />
          </button>
        </footer>

      </div>
    </div>
  );
};

export default UrbanAdvisorModal;
