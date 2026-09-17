import React from 'react';
import {
  Sparkles,
  BookOpen,
  Calculator,
  Landmark,
  FlaskConical,
  Folder,
} from 'lucide-react';
import { SubjectType } from '../types/notes';

interface SubjectIconProps {
  subject: SubjectType | string;
  size?: number;
  className?: string;
}

export const SubjectIcon: React.FC<SubjectIconProps> = ({
  subject,
  size = 16,
  className = '',
}) => {
  switch (subject) {
    case 'all':
      return <Sparkles size={size} className={className} />;
    case 'czech':
      return <BookOpen size={size} className={className} />;
    case 'maths':
      return <Calculator size={size} className={className} />;
    case 'history':
      return <Landmark size={size} className={className} />;
    case 'science':
      return <FlaskConical size={size} className={className} />;
    default:
      return <Folder size={size} className={className} />;
  }
};
