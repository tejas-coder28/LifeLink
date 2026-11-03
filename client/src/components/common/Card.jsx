import React from 'react';
import GlassCard from './GlassCard';

/**
 * Card adapter component ensuring seamless backward compatibility with GlassCard.
 */
const Card = (props) => {
  return <GlassCard {...props} />;
};

export default Card;
