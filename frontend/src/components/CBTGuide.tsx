'use client';

import React from 'react';
import { Brain, Target, Lightbulb, BookOpen, CheckCircle2, AlertCircle } from 'lucide-react';
import { CBT_DISTORTIONS } from '@/lib/cbt-content';

export function CBTGuide() {
  const distortions = CBT_DISTORTIONS;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-12">
      <section className="bg-card rounded-3xl p-6 border border-border shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 rounded-xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">What are Cognitive Distortions?</h2>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Cognitive distortions are biased ways of thinking that aren&apos;t based on facts. 
          They are internal mental filters or biases that increase our misery, fuel our anxiety, 
          and make us feel bad about ourselves. These patterns often happen automatically 
          and can feel very convincing, even when they are inaccurate.
        </p>
        <div className="mt-4 p-4 bg-secondary rounded-2xl flex items-start gap-3">
          <Target className="w-5 h-5 text-brand-700 dark:text-brand-400 mt-1" />
          <div>
            <span className="text-sm font-bold text-foreground block">Desired Outcome</span>
            <p className="text-sm text-muted-foreground">
              The goal is to reduce negative thinking patterns, improve emotional regulation, 
              and develop a more balanced, realistic perspective on life&apos;s challenges.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <AlertCircle className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Common Distortions</h3>
        </div>
        <div className="grid gap-4">
          {distortions.map((d) => (
            <div key={d.name} className="bg-card rounded-2xl p-5 border border-border shadow-sm hover:border-brand-100 dark:hover:border-brand-900 transition-colors">
              <h4 className="font-bold text-foreground mb-2">{d.name}</h4>
              <p className="text-sm text-muted-foreground mb-4">{d.definition}</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                  <span className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest block mb-1">Example</span>
                  <p className="text-xs text-red-800 dark:text-red-300 italic">&quot;{d.example}&quot;</p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                  <span className="text-[10px] font-black text-green-600 dark:text-green-400 uppercase tracking-widest block mb-1">Reframe</span>
                  <p className="text-xs text-green-800 dark:text-green-300 font-medium">&quot;{d.reframe}&quot;</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-brand-700 dark:bg-brand-800 rounded-3xl p-6 text-white shadow-xl shadow-brand-100 dark:shadow-none">
        <div className="flex items-center gap-3 mb-4">
          <Lightbulb className="w-6 h-6 text-brand-100" />
          <h2 className="text-2xl font-bold">Reframing Techniques</h2>
        </div>
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-brand-600 dark:bg-brand-700 flex-shrink-0 flex items-center justify-center font-bold text-xs">1</div>
            <div>
              <span className="font-bold block text-white">The Double-Standard Method</span>
              <p className="text-sm text-brand-50">Talk to yourself in the same compassionate way you would talk to a friend.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-brand-600 dark:bg-brand-700 flex-shrink-0 flex items-center justify-center font-bold text-xs">2</div>
            <div>
              <span className="font-bold block text-white">Examine the Evidence</span>
              <p className="text-sm text-brand-50">Instead of assuming your thought is true, list the actual facts for and against it.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-brand-600 dark:bg-brand-700 flex-shrink-0 flex items-center justify-center font-bold text-xs">3</div>
            <div>
              <span className="font-bold block text-white">The Survey Method</span>
              <p className="text-sm text-brand-50">Ask others you trust if they see the situation the same way you do.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-card rounded-3xl p-6 border border-border shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl">
            <Brain className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Practice Exercises</h2>
        </div>
        
        <div className="space-y-6">
          <div className="border-l-4 border-purple-200 dark:border-purple-900/50 pl-4">
            <h4 className="font-bold text-foreground">Exercise 1: Catch & Label</h4>
            <p className="text-sm text-muted-foreground mt-1">
              For the next 24 hours, try to &quot;catch&quot; yourself having a negative thought. 
              Write it down and label which distortion it fits into.
            </p>
          </div>
          
          <div className="border-l-4 border-purple-200 dark:border-purple-900/50 pl-4">
            <h4 className="font-bold text-foreground">Exercise 2: The Courtroom</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Take one persistent negative thought. Act as the &quot;defense attorney&quot; and find 
              3 pieces of solid evidence that prove the thought is NOT 100% true.
            </p>
          </div>

          <div className="pt-4 border-t border-border">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span className="text-sm font-bold text-foreground uppercase tracking-wider">Target Audience</span>
            </div>
            <p className="text-sm text-muted-foreground">
              This guide is designed for individuals seeking self-help tools for mental well-being, 
              as well as a supplementary aid for therapists to use with their clients during CBT sessions.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}