# MindfulTrack: CBT & Mood Tracker

MindfulTrack is a comprehensive Cognitive Behavioral Therapy (CBT) and mood tracking application designed to help users identify thought patterns, manage emotions, and develop healthier cognitive habits.

## 🌟 Features

- **📊 Mood Check-in**: Quickly log your current mood (1-10) along with specific emotions and notes. Track your mood trends over time with interactive charts.
- **📓 CBT Journaling**: Step-by-step journaling process to identify automatic thoughts, recognize cognitive distortions, and develop rational reframes.
- **✏️ Entry Management**: Full support for editing your CBT journal entries even after they've been created.
- **📈 Dynamic Insights**: Visualize your mental health progress. Understand your most frequent cognitive distortions, emotion triggers, and behavioral patterns.
- **📚 CBT Guide**: A comprehensive educational resource explaining common cognitive distortions (like All-or-Nothing Thinking, Overgeneralization, etc.) with examples and reframing techniques.
- **📜 History Synthesis**: A structured history view that provides objective summaries of your entries and suggests actionable steps based on your personal patterns.
- **🌓 Dark Mode Support**: Fully responsive UI with high-contrast support for both light and dark modes.

## 🛠️ Tech Stack

- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router)
- **Database**: [SQLite](https://sqlite.org/) via `better-sqlite3`
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Charts**: [Recharts](https://recharts.org/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Testing**: [Vitest](https://vitest.dev/) & [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

## 🚀 Getting Started

### Prerequisites

- Node.js 20.x or later
- npm (or yarn/pnpm/bun)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd mood-tracker
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open the app**:
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm start
```

## 📖 Usage Examples

### Logging a Mood
1. Navigate to the **Mood** tab.
2. Select your rating from 1 to 10.
3. Select any emotions you're currently feeling.
4. (Optional) Tag a **Trigger** (e.g., "Work") and a **Behavior** (e.g., "Exercise").
5. Click **Log Mood**.

### Using the CBT Journal
1. Navigate to the **Journal** tab.
2. Follow the 5-step process:
   - **Step 1**: Describe the situation and your initial mood.
   - **Step 2**: Write down your automatic thoughts.
   - **Step 3**: Identify which cognitive distortions match your thoughts.
   - **Step 4**: Provide a rational response to reframe the situation and rate your mood again.
   - **Step 5**: Note any behavioral links or planned actions.
3. Click **Complete Entry**.

### Viewing Insights
Navigate to the **Insights** tab to see your progress metrics, including your most common distortions and how much relief (mood improvement) you typically gain from the journaling process.

## 🧪 Testing

Run the test suite using Vitest:

```bash
npm test
```

## 📄 License

This project is private and intended for personal/educational use.

## 🚀 Deployment

### Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.