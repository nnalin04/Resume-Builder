import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-surface-50 font-sans text-slate-900 selection:bg-brand-500 selection:text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-white/20 px-6 py-4 flex items-center justify-between shrink-0 transition-all shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-600 rounded-lg flex items-center justify-center shadow-soft">
            <span className="text-white text-sm font-outfit font-bold">R</span>
          </div>
          <span className="font-outfit font-bold text-lg text-slate-900 tracking-tight">Resume Builder</span>
        </div>
        
        <div className="flex items-center gap-4">
          {user ? (
            <Link to="/editor" className="px-5 py-2 text-sm font-semibold text-white bg-slate-900 rounded-full hover:bg-slate-800 transition-all shadow-md hover:shadow-lg">
              Go to Editor
            </Link>
          ) : (
            <>
              <Link to="/login" className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors hidden sm:block">
                Log in
              </Link>
              <Link to="/editor" className="px-5 py-2.5 text-sm font-bold text-white bg-brand-600 rounded-full hover:bg-brand-700 transition-all shadow-soft hover:shadow-glow">
                Build my resume
              </Link>
            </>
          )}
        </div>
      </nav>

      <main className="pt-32 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center">
        
        {/* Hero Section */}
        <motion.section 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative w-full max-w-4xl mx-auto mt-10 md:mt-20 text-center flex flex-col items-center justify-center"
        >
          {/* Abstract glows */}
          <div className="absolute top-0 right-10 w-[300px] h-[300px] bg-brand-400 rounded-full mix-blend-multiply filter blur-[120px] opacity-40 animate-subtle-pulse pointer-events-none"></div>
          <div className="absolute top-20 left-10 w-[250px] h-[250px] bg-purple-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-subtle-pulse pointer-events-none" style={{ animationDelay: '1.5s' }}></div>

          <div className="relative z-10 w-full flex flex-col items-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-sm text-brand-600 text-sm font-semibold mb-6">
              ✨ Free PDF downloads included
            </div>
            
            <h1 className="font-outfit text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mb-6 leading-tight max-w-3xl">
              The professional resume you deserve.
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-500 mb-10 max-w-2xl leading-relaxed">
              Create an ATS-optimized, beautiful resume in minutes. Stand out from the crowd and land your next dream job.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <Link to="/editor" className="w-full sm:w-auto px-8 py-4 text-lg font-bold text-white bg-brand-600 rounded-full hover:bg-brand-700 transition-all shadow-glow hover:shadow-lg hover:-translate-y-0.5">
                Create my resume
              </Link>
              <Link to="/pricing" className="w-full sm:w-auto px-8 py-4 text-lg font-semibold text-slate-700 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-all shadow-sm">
                View pricing
              </Link>
            </div>
            
            <p className="mt-4 text-sm text-slate-400">No credit card required. Free to try.</p>
          </div>
        </motion.section>

        {/* Feature Preview wrapper */}
        <motion.section 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="mt-24 md:mt-32 w-full relative z-10"
        >
          <div className="bg-slate-900 rounded-3xl p-2 md:p-8 shadow-2xl relative overflow-hidden">
             {/* Decorative grid */}
             <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0wIDBoNDB2NDBIMHoiIGZpbGw9Im5vbmUiLz4KPHBhdGggZD0iTTAgMEg0MFYxSDB6bTAgMzkiIGZpbGw9IiMzMzQxNTUiLz4KPHBhdGggZD0iTTAgMFY0MEgxVjB6bTM5IDAiIGZpbGw9IiMzMzQxNTUiLz4KPC9zdmc+')] opacity-20 pointer-events-none"></div>
             
             <div className="relative bg-white rounded-2xl md:rounded-[2rem] overflow-hidden aspect-[16/10] sm:aspect-[16/9] shadow-inner border border-white/10 flex items-center justify-center p-4">
                <div className="text-center">
                  <div className="w-20 h-20 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                    <svg className="w-10 h-10 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  </div>
                  <h3 className="font-outfit text-2xl font-bold text-slate-800 mb-2">Beautiful PDF Exports</h3>
                  <p className="text-slate-500 max-w-sm mx-auto">Pixel-perfect A4 designs that look great on screen and in print.</p>
                </div>
             </div>
          </div>
        </motion.section>

      </main>
      
      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-slate-900 rounded flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">R</span>
            </div>
            <span className="font-semibold text-sm text-slate-800">Resume Builder Inc.</span>
          </div>
          <p className="text-sm text-slate-500">© 2026 Resume Builder. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
