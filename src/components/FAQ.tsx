import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  { 
    question: "How do I start investing?", 
    answer: "Create an account, access the portal, and purchase a minimum of 2,000 shares (₦10,000) to activate your daily returns." 
  },
  { 
    question: "What is the daily return rate?", 
    answer: "Investors receive a 4% daily return on their active share investments, credited directly to their available balance." 
  },
  { 
    question: "When can I withdraw my earnings?", 
    answer: "You can withdraw your earnings instantly at any time to your bank account, subject to a standard 4% platform processing fee." 
  },
  { 
    question: "How does the referral system work?", 
    answer: "Share your unique referral code with others to earn a lucrative 12% bonus on their initial share investments." 
  },
  { 
    question: "How long is the maturity period?", 
    answer: "Each share investment package matures after 180 days, maximizing your potential returns over a sustained period." 
  }
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
          Frequently <span className="text-amber-500">Asked</span> Questions
        </h2>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Everything you need to know about the platform</p>
      </div>
      
      <div className="space-y-4">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div 
              key={index} 
              className={`border border-slate-800 rounded-2xl overflow-hidden transition-colors ${isOpen ? 'bg-slate-900/80 border-slate-700' : 'bg-slate-900/30 hover:bg-slate-900/50'}`}
            >
              <button
                className="w-full px-6 py-5 flex items-center justify-between focus:outline-none"
                onClick={() => setOpenIndex(isOpen ? null : index)}
              >
                <span className="font-bold text-left text-slate-200">{faq.question}</span>
                <ChevronDown className={`h-5 w-5 text-amber-500 transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >
                    <div className="px-6 pb-5 text-slate-400 text-sm leading-relaxed border-t border-slate-800/50 pt-4">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
