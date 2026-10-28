import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import axios from 'axios';

// Component to handle map clicks
function MapClickHandler({ setLocation }) {
  useMapEvents({
    click(e) {
      setLocation([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

function App() {
  const defaultCenter = [12.793, 80.025]; // Centered near Maraimalai Nagar
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reports, setReports] = useState([]);
  
  // New State for Form and Selected Location
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });

  const API_URL = "https://6ydteuan6b.execute-api.ap-southeast-2.amazonaws.com/prod/report";

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await axios.get(API_URL);
      let data = response.data;
      if (typeof data === 'string') data = JSON.parse(data);
      if (data && data.body) {
        data = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
      }
      if (Array.isArray(data)) setReports(data);
    } catch (error) {
      console.error("Error fetching reports:", error);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLocation) {
      alert("Please click on the map to select the waterlogging location.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await axios.post(API_URL, {
        lat: selectedLocation[0],
        lng: selectedLocation[1],
        name: formData.name,
        phone: formData.phone,
        address: formData.address
      });

      let data = response.data;
      if (typeof data === 'string') data = JSON.parse(data);
      if (data && data.body) {
         data = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
      }

      alert("✅ Success! " + (data.message || "Report sent to authorities."));
      
      setFormData({ name: '', phone: '', address: '' });
      setSelectedLocation(null);
      fetchReports(); 
    } catch (error) {
      console.error("Error submitting:", error);
      alert("Failed to submit report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', fontFamily: 'sans-serif' }}>
      
      {/* Left Sidebar Form */}
      <div style={{ width: '350px', padding: '20px', backgroundColor: '#f8fafc', boxShadow: '2px 0 10px rgba(0,0,0,0.1)', zIndex: 1000, overflowY: 'auto' }}>
        <h1 style={{ fontSize: '24px', color: '#1e293b', marginBottom: '5px' }}>MonsoonLens 🌧️</h1>
        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>Active Reports: {reports.length}</p>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#334155' }}>Full Name</label>
            <input type="text" name="name" value={formData.name} onChange={handleInputChange} required style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
          </div>
          <div>
            <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#334155' }}>Phone Number</label>
            <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} required style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
          </div>
          <div>
            <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#334155' }}>Landmark / Address</label>
            <textarea name="address" value={formData.address} onChange={handleInputChange} required rows="3" style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
          </div>
          
          <div style={{ padding: '10px', backgroundColor: selectedLocation ? '#dcfce7' : '#fee2e2', borderRadius: '6px', fontSize: '14px', textAlign: 'center' }}>
            {selectedLocation ? `📍 Location Selected` : `⚠️ Click on the map to pin location`}
          </div>

          <button type="submit" disabled={isSubmitting || !selectedLocation} style={{ padding: '12px', backgroundColor: isSubmitting || !selectedLocation ? '#94a3b8' : '#dc2626', color: 'white', border: 'none', borderRadius: '6px', cursor: isSubmitting || !selectedLocation ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
            {isSubmitting ? 'Transmitting...' : '🚨 Submit Report'}
          </button>
        </form>
      </div>

      {/* Right Map Layer */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer center={defaultCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer attribution='&copy; OSM' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapClickHandler setLocation={setSelectedLocation} />
          
          {/* Show a pin where the user just clicked */}
          {selectedLocation && (
             <Marker position={selectedLocation}>
               <Popup>Report this location</Popup>
             </Marker>
          )}

          {/* Show all existing reports */}
          {Array.isArray(reports) && reports.map((report, index) => {
            const lat = parseFloat(report.Latitude);
            const lng = parseFloat(report.Longitude);
            if (isNaN(lat) || isNaN(lng)) return null;
            return (
              <Marker key={report.ReportID || index} position={[lat, lng]}>
                <Popup>
                  <b>{report.ReporterName || 'Anonymous'}</b><br />
                  {report.Address && <span>{report.Address}<br/></span>}
                  <small>{new Date(report.Timestamp).toLocaleString()}</small>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}

export default App;
