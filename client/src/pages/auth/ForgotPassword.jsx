import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { HeartHandshake, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import PageTransition from '../../components/common/PageTransition';
import Button from '../../components/common/Button';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <PageTransition className="min-h-[75vh] flex items-center justify-center p-3 sm:p-6 py-8">
      <div className="w-full max-w-md rounded-3xl p-6 sm:p-8 space-y-6 glass-modal border border-glass shadow-elevated">
        {/* Header */}
        <div className="text-center space-y-3">
          <Link to="/" className="inline-flex items-center space-x-2">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-white bg-gradient-to-br from-brand-500 to-brand-700 shadow-glow-brand">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <span className="text-xl font-black text-primary font-heading">
              Life<span className="gradient-text-brand">Link</span>
            </span>
          </Link>
          <h1 className="text-xl font-black text-primary tracking-tight pt-1 font-heading">
            Reset Password
          </h1>
          <p className="text-xs text-secondary">
            Enter your registered email and we'll send reset instructions.
          </p>
        </div>

        {submitted ? (
          <div className="p-4 rounded-2xl text-xs font-semibold space-y-3 bg-teal-500/10 border border-teal-500/30 text-teal-400">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-teal-400" />
              <span>Instructions sent! Check your inbox for <b className="text-primary">{email}</b>.</span>
            </div>
            <Link
              to="/login"
              className="inline-block font-bold hover:underline text-xs text-brand-400"
            >
              Return to Sign In →
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reset-email" className="block text-[10px] font-extrabold uppercase tracking-wider mb-1.5 text-secondary">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="reset-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="donor@lifelink.com"
                  className="glass-input w-full pl-10 text-xs sm:text-sm px-3.5 py-3"
                />
              </div>
            </div>

            <Button type="submit" variant="primary" className="w-full py-3 rounded-xl text-xs font-bold shadow-glow-brand">
              Send Reset Link
            </Button>
          </form>
        )}

        <div className="text-center pt-1">
          <Link
            to="/login"
            className="inline-flex items-center text-xs font-bold transition-colors text-secondary hover:text-primary"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </div>
    </PageTransition>
  );
};

export default ForgotPassword;
