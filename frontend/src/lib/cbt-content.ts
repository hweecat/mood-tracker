export interface DistortionDefinition {
  name: string;
  definition: string;
  example: string;
  reframe: string;
}

export const CBT_DISTORTIONS: DistortionDefinition[] = [
  {
    name: 'All-or-Nothing Thinking',
    definition: 'Viewing situations in black-and-white categories. If a performance falls short of perfect, you see yourself as a total failure.',
    example: 'I didn\'t get an A on the test, so I\'m a complete failure.',
    reframe: 'One test doesn\'t define my entire capability. I can learn from this.'
  },
  {
    name: 'Overgeneralization',
    definition: 'Seeing a single negative event as a never-ending pattern of defeat.',
    example: 'I didn\'t get this job; I\'ll never find work.',
    reframe: 'This specific opportunity didn\'t work out, but it doesn\'t mean others won\'t.'
  },
  {
    name: 'Mental Filter',
    definition: 'Picking out a single negative detail and dwelling on it exclusively, so that your vision of all reality becomes darkened.',
    example: 'My boss liked 90% of my presentation, but she asked one hard question. The whole thing was a disaster.',
    reframe: 'Most of the feedback was positive. One question is just an area for clarification, not a sign of failure.'
  },
  {
    name: 'Disqualifying the Positive',
    definition: 'Rejecting positive experiences by insisting they \'don\'t count\' for some reason or another.',
    example: 'They only said they liked my cooking because they were being nice.',
    reframe: 'I put effort into the meal and they enjoyed it. I should accept the compliment.'
  },
  {
    name: 'Mind Reading',
    definition: 'Assuming you know what people think without having sufficient evidence of their thoughts.',
    example: 'He didn\'t say hi, he must hate me.',
    reframe: 'I can\'t read minds. He might be busy, shy, or just didn\'t see me.'
  },
  {
    name: 'Fortune Telling',
    definition: 'Predicting the future negatively: things will get worse, or there is danger ahead.',
    example: 'I just know I\'m going to mess up the interview.',
    reframe: 'I cannot predict the future. If I prepare well, I increase my chances of success.'
  },
  {
    name: 'Magnification/Minimization',
    definition: 'Exaggerating the importance of things (such as your mistake) or inappropriately shrinking things until they appear tiny (your own desirable qualities).',
    example: 'My small mistake is catastrophic, but my big promotion was just luck.',
    reframe: 'Mistakes happen and are rarely \'catastrophic.\' My promotion was a result of my hard work.'
  },
  {
    name: 'Emotional Reasoning',
    definition: 'Assuming that your negative emotions necessarily reflect the way things really are.',
    example: 'I feel like an idiot, so I must be one.',
    reframe: 'Feelings are not facts. I might feel overwhelmed right now, but that doesn\'t mean I am incompetent.'
  },
  {
    name: 'Should Statements',
    definition: 'Trying to motivate yourself with \'shoulds\' and \'shouldn\'ts,\' as if you were to be whipped and punished before you could be expected to do anything.',
    example: 'I should be able to handle this without getting stressed.',
    reframe: 'It\'s okay to feel stressed. I am doing my best to manage the situation.'
  },
  {
    name: 'Labeling',
    definition: 'An extreme form of overgeneralization. Instead of describing your error, you attach a negative label to yourself.',
    example: 'I made a mistake, therefore I\'m a \'loser.\' ',
    reframe: 'I made a mistake, but that doesn\'t define who I am. I am a person who is learning.'
  },
  {
    name: 'Personalization',
    definition: 'Seeing yourself as the cause of some negative external event which in fact you were not primarily responsible for.',
    example: 'The party wasn\'t fun because I didn\'t talk enough; it&apos;s my fault everyone was bored.',
    reframe: 'Many factors contribute to a party&apos;s atmosphere. I am not solely responsible for everyone else\'s enjoyment.'
  },
  {
    name: 'Control Fallacies',
    definition: 'Feeling externally controlled as a helpless victim of fate, or internally controlled (responsible for the pain and happiness of everyone around you).',
    example: 'I can\'t help it if the quality of the work is poor, my boss demanded I work overtime.',
    reframe: 'I can\'t control everything, but I am responsible for my own actions and reactions.'
  },
  {
    name: 'Fallacy of Fairness',
    definition: 'Feeling resentful because you think you know what is fair, but other people do not agree with you.',
    example: 'It\'s not fair that he got the promotion when I worked harder.',
    reframe: 'Life isn\'t always fair. Focusing on what I can control is more productive than dwelling on resentment.'
  }
];
