export interface SocialMission {
  emoji: string;
  title: string;
  description: string;
}

export const SOCIAL_CONTEXTS = [
  { id: 'coffee', label: '☕ Coffee Shop', emoji: '☕' },
  { id: 'work', label: '🏢 Work/School', emoji: '🏢' },
  { id: 'party', label: '🎉 Party/Event', emoji: '🎉' },
  { id: 'store', label: '🏪 Store', emoji: '🏪' },
  { id: 'transit', label: '🚌 Transit', emoji: '🚌' },
  { id: 'outside', label: '🌳 Outside', emoji: '🌳' },
  { id: 'home', label: '🏠 Home', emoji: '🏠' },
  { id: 'online', label: '📱 Online', emoji: '📱' },
];

export const STATIC_MISSIONS: Record<string, SocialMission[]> = {
  coffee: [
    { emoji: '😊', title: 'Smile at the barista', description: 'Make eye contact and give a genuine smile when ordering.' },
    { emoji: '💬', title: 'Comment on their day', description: 'Ask "How\'s your day going?" after ordering your drink.' },
    { emoji: '📖', title: 'Sit near someone', description: 'Choose a seat near another solo patron and just be present.' },
    { emoji: '✏️', title: 'Compliment something', description: 'Compliment the café décor or a stranger\'s bag or book.' },
    { emoji: '🤝', title: 'Start a brief chat', description: 'Ask someone what they\'re working on or reading today.' },
  ],
  work: [
    { emoji: '👋', title: 'Greet a colleague', description: 'Say good morning to someone you don\'t usually talk to.' },
    { emoji: '💡', title: 'Share an idea', description: 'Speak up in a meeting or channel with one observation.' },
    { emoji: '☕', title: 'Invite someone to coffee', description: 'Ask a coworker if they want to grab a coffee or tea.' },
    { emoji: '🙏', title: 'Give public praise', description: 'Acknowledge a teammate\'s contribution in front of others.' },
    { emoji: '🤔', title: 'Ask for advice', description: 'Ask a more experienced colleague for their take on something.' },
  ],
  party: [
    { emoji: '👀', title: 'Introduce yourself to one person', description: 'Find someone standing alone and introduce yourself.' },
    { emoji: '🎉', title: 'Compliment the host', description: 'Tell the host one specific thing you appreciate about the event.' },
    { emoji: '🍕', title: 'Join a group conversation', description: 'Step into a group chat and add one comment or question.' },
    { emoji: '😂', title: 'Share a light story', description: 'Tell one funny or interesting story from your week.' },
    { emoji: '📸', title: 'Offer to take a photo', description: 'Offer to photograph a group — easy way to connect.' },
  ],
  store: [
    { emoji: '🛒', title: 'Ask a staff member for help', description: 'Ask where something is instead of searching alone.' },
    { emoji: '😊', title: 'Smile at the cashier', description: 'Make genuine eye contact and smile during checkout.' },
    { emoji: '💬', title: 'Give a compliment', description: 'Compliment a stranger\'s choice of product or their style.' },
    { emoji: '🙌', title: 'Let someone go first', description: 'Offer your spot in line and say something friendly.' },
    { emoji: '📦', title: 'Ask for a recommendation', description: 'Ask a staff member what their personal favorite product is.' },
  ],
  transit: [
    { emoji: '👋', title: 'Acknowledge a fellow rider', description: 'Give a brief nod or smile to someone near you.' },
    { emoji: '🗺️', title: 'Help with directions', description: 'If someone looks lost, offer help proactively.' },
    { emoji: '📖', title: 'Comment on what they\'re reading', description: 'Ask about the book or podcast a fellow rider is enjoying.' },
    { emoji: '🚪', title: 'Hold the door or space', description: 'Hold the door and say something brief and warm.' },
    { emoji: '🐕', title: 'Compliment a pet', description: 'If someone has a dog or unusual item, compliment it.' },
  ],
  outside: [
    { emoji: '🌤️', title: 'Comment on the weather', description: 'Make a brief, friendly comment about the day to someone passing.' },
    { emoji: '🐕', title: 'Pet and compliment a dog', description: 'Ask to pet someone\'s dog and chat briefly with the owner.' },
    { emoji: '🏃', title: 'Nod at a runner', description: 'Make eye contact and nod at another runner or walker.' },
    { emoji: '🌸', title: 'Compliment someone\'s garden', description: 'Tell a homeowner their yard or flowers look beautiful.' },
    { emoji: '📸', title: 'Ask someone to take your photo', description: 'Ask a stranger to snap a photo of you — easy interaction.' },
  ],
  home: [
    { emoji: '📞', title: 'Call a friend or family member', description: 'Pick up the phone and call someone you care about.' },
    { emoji: '💌', title: 'Send a thoughtful message', description: 'Text someone a genuine compliment or check-in message.' },
    { emoji: '📱', title: 'Post something authentic', description: 'Share something genuine on social media or a group chat.' },
    { emoji: '🎮', title: 'Join an online game or activity', description: 'Join a group online game or community event.' },
    { emoji: '🤝', title: 'Reach out to someone new', description: 'Follow up with someone you met recently and want to know better.' },
  ],
  online: [
    { emoji: '💬', title: 'Reply to a post meaningfully', description: 'Write a genuine, thoughtful reply to someone\'s post.' },
    { emoji: '🙌', title: 'Compliment someone\'s work', description: 'Tell someone online that their content or work is valuable.' },
    { emoji: '🤝', title: 'Introduce yourself in a community', description: 'Introduce yourself in a Discord, forum, or group.' },
    { emoji: '💡', title: 'Share something you made', description: 'Post something you created or an idea you had.' },
    { emoji: '🎙️', title: 'Join a voice or video call', description: 'Hop into a community voice chat or video call.' },
  ],
};
