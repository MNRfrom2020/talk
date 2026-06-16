import React from 'react';
import { BadgeCheck } from 'lucide-react';

interface RoleBadgeProps {
  roles: string | string[];
}

const RoleBadge: React.FC<RoleBadgeProps> = ({ roles }) => {
  // যদি কোনো রোল না থাকে, তাহলে কিছুই দেখাবে না
  if (!roles || (Array.isArray(roles) && roles.length === 0)) return null;

  // ডেটা স্ট্রিং বা অ্যারে যেভাবেই আসুক, আমরা সেটাকে লোয়ারকেস অ্যারেতে কনভার্ট করে নেব
  const roleArray = Array.isArray(roles) 
    ? roles.map(r => r.toLowerCase()) 
    : [roles.toLowerCase()];

  // প্রায়োরিটি লিস্ট (যেটা ওপরে থাকবে তার পাওয়ার সবচেয়ে বেশি)
  const PRIORITY_LIST = [
    'super admin',
    'admin',
    'super user',
    'contributor',
    'subscriber',
    'user',
    'guest'
  ];

  // রোলের কালার ম্যাপ
  const ROLE_COLORS: Record<string, string> = {
    'super admin': 'text-purple-600',
    'admin': 'text-red-600',
    'super user': 'text-amber-500',
    'contributor': 'text-emerald-500',
    'subscriber': 'text-blue-500',
    'user': 'hidden',
    'guest': 'hidden'
  };

  // ম্যাজিক লজিক: প্রায়োরিটি লিস্টের ওপর থেকে খুঁজবে ইউজারের কোন রোলটা আছে
  const highestRole = PRIORITY_LIST.find(role => roleArray.includes(role));

  // কালার বের করা (না পেলে hidden)
  const colorClass = highestRole ? ROLE_COLORS[highestRole] : 'hidden';

  // যদি ইউজার/গেস্ট হয় বা কালার না থাকে, তবে আইকন দেখাবে না
  if (colorClass === 'hidden' || !colorClass) return null;

  // ফাইনাল ভেরিফাইড টিক চিহ্ন!
  return (
    <span 
      title={highestRole ? highestRole.replace(/\b\w/g, l => l.toUpperCase()) : ''} 
      className="inline-flex items-center justify-center"
    >
      <BadgeCheck className={`w-5 h-5 ml-1.5 ${colorClass}`} />
    </span>
  );
};

export default RoleBadge;
