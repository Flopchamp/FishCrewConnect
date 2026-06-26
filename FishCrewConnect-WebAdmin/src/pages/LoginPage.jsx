import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Fish, Eye, EyeOff, Mail, Lock, Shield } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (error) {
      // Error handled in AuthContext with toast
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Branding */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #003566 0%, #0077B6 55%, #44DBE9 100%)' }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full"
          style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full"
          style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="absolute top-1/2 right-12 w-40 h-40 rounded-full"
          style={{ background: 'rgba(255,255,255,0.04)' }} />

        {/* Logo */}
        <div className="flex items-center space-x-3 relative z-10">
          <div className="p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
            <Fish className="h-7 w-7 text-white" />
          </div>
          <span className="text-white text-xl font-bold tracking-tight">FishCrewConnect</span>
        </div>

        {/* Center content */}
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white leading-snug mb-4">
            Manage Your<br />
            <span style={{ color: '#90E8F4' }}>Fishing Platform</span>
          </h1>
          <p className="text-blue-100 text-base mb-10 leading-relaxed max-w-xs">
            Full control over users, jobs, payments and platform settings — all in one place.
          </p>

          <div className="space-y-4">
            {[
              'Manage fishermen & boat owners',
              'Oversee job postings & applications',
              'Monitor payments & transactions',
              'Configure platform settings',
            ].map((item, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: '#44DBE9' }}>
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-blue-100 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Wave decoration */}
        <div className="absolute bottom-0 left-0 right-0 z-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 60C240 100 480 20 720 60C960 100 1200 20 1440 60V120H0V60Z" fill="white" fillOpacity="0.04" />
            <path d="M0 80C240 40 480 120 720 80C960 40 1200 120 1440 80V120H0V80Z" fill="white" fillOpacity="0.04" />
          </svg>
        </div>

        <p className="relative z-10 text-blue-200 text-xs">
          © 2025 FishCrewConnect. All rights reserved.
        </p>
      </div>

      {/* Right Panel — Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">

          {/* Mobile-only logo */}
          <div className="lg:hidden flex items-center justify-center space-x-2 mb-10">
            <div className="p-2 rounded-xl" style={{ background: '#0077B6' }}>
              <Fish className="h-6 w-6 text-white" />
            </div>
            <span className="text-gray-900 text-xl font-bold">FishCrewConnect</span>
          </div>

          {/* Badge */}
          <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
            style={{ background: '#e0f5fb', color: '#0077B6' }}>
            <Shield className="h-3.5 w-3.5" />
            <span>Admin Access Only</span>
          </div>

          {/* Heading */}
          <h2 className="text-3xl font-bold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-gray-500 text-sm mb-8">Sign in to your admin dashboard</p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 bg-white text-sm transition-all focus:outline-none focus:border-blue-400"
                  style={{ boxShadow: 'none' }}
                  onFocus={e => e.target.style.boxShadow = '0 0 0 3px rgba(0,119,182,0.15)'}
                  onBlur={e => e.target.style.boxShadow = 'none'}
                  placeholder="admin@fishcrewconnect.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="block w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 bg-white text-sm transition-all focus:outline-none focus:border-blue-400"
                  style={{ boxShadow: 'none' }}
                  onFocus={e => e.target.style.boxShadow = '0 0 0 3px rgba(0,119,182,0.15)'}
                  onBlur={e => e.target.style.boxShadow = 'none'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center py-3 px-4 text-white font-semibold rounded-xl text-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              style={{
                background: isLoading ? '#0077B6' : 'linear-gradient(90deg, #0077B6 0%, #44DBE9 100%)',
                boxShadow: '0 4px 20px rgba(0,119,182,0.35)',
              }}
              onMouseEnter={e => !isLoading && (e.target.style.opacity = '0.92')}
              onMouseLeave={e => (e.target.style.opacity = '1')}
            >
              {isLoading ? (
                <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                'Sign in to Dashboard'
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-gray-400">
            Protected area. Unauthorized access is strictly prohibited.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
