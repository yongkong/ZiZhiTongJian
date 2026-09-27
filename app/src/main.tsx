import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './lib/auth.tsx'
import { BoyangBooks, BoyangBook, BoyangSection } from './pages/Boyang.tsx'
import { Dashboard } from './pages/Dashboard.tsx'
import { Login } from './pages/Login.tsx'
import { LessonDetail, LessonList } from './pages/Lessons.tsx'
import { Review } from './pages/Review.tsx'
import { VolumeList, VolumeView } from './pages/Reader.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<App />}>
            <Route index element={<Dashboard />} />
            <Route path="lessons" element={<LessonList />} />
            <Route path="lessons/:slug" element={<LessonDetail />} />
            <Route path="read" element={<VolumeList />} />
            <Route path="read/:num" element={<VolumeView />} />
            <Route path="boyang" element={<BoyangBooks />} />
            <Route path="boyang/book/:id" element={<BoyangBook />} />
            <Route path="boyang/section/:id" element={<BoyangSection />} />
            <Route path="review" element={<Review />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
