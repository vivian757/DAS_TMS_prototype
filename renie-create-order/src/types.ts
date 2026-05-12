/** Skill-agnostic message types used by App / MessageBubble */
export type ConversationMessage =
  | { id: string; role: 'user'; kind: 'text'; text: string }
  | { id: string; role: 'renie'; kind: 'text'; text: string }
  | {
      id: string;
      role: 'renie';
      kind: 'artifact';
      skillId: string;
      artifactId: string;
    };
