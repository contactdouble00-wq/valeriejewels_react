import assert from 'node:assert/strict';
import { cleanStorefrontCopy, cleanStorefrontText } from './storefrontCopy.js';

assert.equal(cleanStorefrontText('✨ Free box • 🚀 Dispatch in 24h'), 'Free box • Dispatch in 24h');
assert.equal(cleanStorefrontText('Save ₹50 + 10% • 5–7 days'), 'Save ₹50 + 10% • 5–7 days');
const input = {
  perk1Text: '🎁 Free gift',
  description: '✨ First detail\n💎 Second detail',
  imageUrl: '/images/🎁.png',
  reviews: [{ text: 'Love it 💖' }],
  partial_advance: 49,
};
const result = cleanStorefrontCopy(input);
assert.equal(result.perk1Text, 'Free gift');
assert.equal(result.description, '- First detail\n- Second detail');
assert.equal(result.imageUrl, input.imageUrl);
assert.deepEqual(result.reviews, input.reviews);
assert.equal(result.partial_advance, 49);
assert.equal(input.perk1Text, '🎁 Free gift');
console.log('Storefront copy checks passed.');
