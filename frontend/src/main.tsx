import React from 'react'
import ReactDOM from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App'
import "leaflet/dist/leaflet.css"
import './i18n' // Initialize i18next

const GOOGLE_CLIENT_ID = "148133878372-ukhvq7kq3g7hkb7402u5it9eaceo9vo8.apps.googleusercontent.com"

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <App />
        </GoogleOAuthProvider>
    </React.StrictMode>,
)
