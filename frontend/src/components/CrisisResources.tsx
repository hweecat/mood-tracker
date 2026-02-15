'use client';

import { useState, useEffect } from 'react';
import { Phone, MessageCircle, Globe, ShieldAlert, LucideIcon, MapPin } from 'lucide-react';

interface ResourceCardProps {
  icon: LucideIcon;
  title: string;
  number: string;
  description: string;
  action: string;
  href: string;
  external?: boolean;
}

interface CountryResources {
  name: string;
  emergency: { number: string; description: string };
  suicide?: { number: string; description: string; title?: string };
  text?: { number: string; description: string; title?: string; href?: string };
}

const CRISIS_DATA: Record<string, CountryResources> = {
  'US': {
    name: 'United States',
    emergency: { number: '911', description: 'For immediate life-threatening emergencies.' },
    suicide: { number: '988', description: 'Suicide & Crisis Lifeline (24/7, Free)', title: '988 Lifeline' },
    text: { number: 'Text HOME to 741741', description: 'Crisis Text Line (24/7, Free)', href: 'sms:741741' }
  },
  'GB': {
    name: 'United Kingdom',
    emergency: { number: '999', description: 'For immediate life-threatening emergencies.' },
    suicide: { number: '116 123', description: 'Samaritans (24/7, Free, Confidential)', title: 'Samaritans' },
    text: { number: 'Text SHOUT to 85258', description: 'Shout Crisis Text Line (24/7)', href: 'sms:85258' }
  },
  'CA': {
    name: 'Canada',
    emergency: { number: '911', description: 'For immediate life-threatening emergencies.' },
    suicide: { number: '988', description: 'Suicide Crisis Helpline (24/7, Free)', title: '988 Helpline' },
    text: { number: 'Text 45645', description: 'Talk Suicide Canada (4pm-Midnight ET)', href: 'sms:45645' }
  },
  'AU': {
    name: 'Australia',
    emergency: { number: '000', description: 'For immediate life-threatening emergencies.' },
    suicide: { number: '13 11 14', description: 'Lifeline (24/7, Crisis Support)', title: 'Lifeline' }
  },
  'IN': {
    name: 'India',
    emergency: { number: '112', description: 'National Emergency Number' },
    suicide: { number: '14416', description: 'Tele-MANAS (24/7 Mental Health Support)', title: 'Tele-MANAS' }
  },
  'SG': {
    name: 'Singapore',
    emergency: { number: '995', description: 'Ambulance / Fire Emergencies' },
    suicide: { number: '1-767', description: 'Samaritans of Singapore (24/7, Free)', title: 'Samaritans of Singapore' }
  },
  'DEFAULT': {
    name: 'International / Other',
    emergency: { number: '112', description: 'Common international emergency number (GSM).' }
  }
};

export function CrisisResources() {
  const [country, setCountry] = useState<string>('US');

  useEffect(() => {
    // Attempt to guess country from timezone
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (timeZone.startsWith('America/New_York') || timeZone.startsWith('America/Los_Angeles') || timeZone.startsWith('America/Chicago')) {
        setCountry('US');
      } else if (timeZone.startsWith('Europe/London')) {
        setCountry('GB');
      } else if (timeZone.startsWith('America/Toronto') || timeZone.startsWith('America/Vancouver')) {
        setCountry('CA');
      } else if (timeZone.startsWith('Australia')) {
        setCountry('AU');
      } else if (timeZone.startsWith('Asia/Kolkata') || timeZone.startsWith('Asia/Calcutta')) {
        setCountry('IN');
      } else if (timeZone.startsWith('Asia/Singapore')) {
        setCountry('SG');
      }
    } catch (e) {
      console.warn('Could not detect timezone', e);
    }
  }, []);

  const resources = CRISIS_DATA[country] || CRISIS_DATA['DEFAULT'];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-red-50 dark:bg-red-900/20 border-l-8 border-red-500 p-6 rounded-r-xl">
        <h2 className="flex items-center gap-3 text-2xl font-black text-red-700 dark:text-red-400 mb-2">
          <ShieldAlert className="w-8 h-8" />
          Immediate Help
        </h2>
        <p className="text-red-800 dark:text-red-300 font-medium leading-relaxed">
          If you or someone else is in immediate danger, please call emergency services immediately.
        </p>
      </div>

      <div className="flex items-center gap-3 p-4 bg-card rounded-2xl border border-border shadow-sm">
        <MapPin className="w-5 h-5 text-muted-foreground" />
        <label htmlFor="country-select" className="sr-only">Select Country</label>
        <select
          id="country-select"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="bg-transparent font-bold text-foreground outline-none w-full cursor-pointer"
        >
          {Object.entries(CRISIS_DATA).map(([code, data]) => (
            <option key={code} value={code} className="bg-card text-foreground">
              {data.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4">
        {/* Emergency Number */}
        <ResourceCard 
          icon={Phone} 
          title="Emergency Services" 
          number={resources.emergency.number} 
          description={resources.emergency.description}
          action="Call Now"
          href={`tel:${resources.emergency.number}`}
        />
        
        {/* Suicide Hotline (if available) */}
        {resources.suicide && (
          <ResourceCard 
            icon={Phone} 
            title={resources.suicide.title || "Crisis Lifeline"} 
            number={resources.suicide.number} 
            description={resources.suicide.description} 
            action="Call Now"
            href={`tel:${resources.suicide.number.replace(/\s/g, '')}`}
          />
        )}

        {/* Text Line (if available) */}
        {resources.text && (
          <ResourceCard 
            icon={MessageCircle} 
            title={resources.text.title || "Crisis Text Line"} 
            number={resources.text.number} 
            description={resources.text.description} 
            action="Text Now"
            href={resources.text.href || `sms:${resources.text.number.replace(/[^0-9]/g, '')}`}
          />
        )}

        {/* International Fallback */}
        <ResourceCard 
          icon={Globe} 
          title="International Resources" 
          number="findahelpline.com" 
          description="Directory of international helplines and crisis centers." 
          action="Visit Website"
          href="https://findahelpline.com"
          external
        />
      </div>

      <div className="bg-secondary/50 p-6 rounded-3xl border-2 border-border text-center space-y-2">
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
          You are not alone
        </p>
        <p className="text-foreground">
          Seeking help is a sign of strength. These services are confidential and staffed by trained professionals who want to help.
        </p>
      </div>
    </div>
  );
}

function ResourceCard({ icon: Icon, title, number, description, action, href, external }: ResourceCardProps) {
  return (
    <a 
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-card p-6 rounded-3xl border-2 border-border shadow-sm hover:border-brand-500 dark:hover:border-brand-500 hover:shadow-md transition-all group"
    >
      <div className="p-4 bg-secondary rounded-2xl group-hover:bg-brand-50 dark:group-hover:bg-brand-900/20 group-hover:text-brand-600 transition-colors">
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-lg text-foreground">{title}</h3>
        <p className="text-2xl font-black text-brand-600 dark:text-brand-400 font-mono my-1">{number}</p>
        <p className="text-sm text-muted-foreground leading-snug">{description}</p>
      </div>
      <div className="mt-4 sm:mt-0 self-stretch sm:self-center flex items-center justify-center px-6 py-3 bg-foreground text-background font-bold rounded-xl text-sm uppercase tracking-wider group-hover:bg-brand-600 dark:group-hover:bg-brand-500 group-hover:text-white transition-colors">
        {action}
      </div>
    </a>
  );
}
