'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { X, CreditCard, Loader2 } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
  amount: number; // in cents
}

function CheckoutForm({ onPaymentSuccess, onClose, amount }: {
  onPaymentSuccess: () => void;
  onClose: () => void;
  amount: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string>('');

  useEffect(() => {
    // Create payment intent
    fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    })
      .then((res) => res.json())
      .then((data) => setClientSecret(data.clientSecret))
      .catch(() => setError('Failed to initialize payment'));
  }, [amount]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    const card = elements.getElement(CardElement);
    if (!card) {
      setError('Card element not found');
      setIsProcessing(false);
      return;
    }

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: card,
      },
    });

    if (error) {
      setError(error.message || 'Payment failed');
      setIsProcessing(false);
    } else if (paymentIntent.status === 'succeeded') {
      onPaymentSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Card Information
        </label>
        <div className="p-3 border border-gray-300 rounded-md">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#374151',
                  '::placeholder': {
                    color: '#9CA3AF',
                  },
                },
              },
            }}
          />
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4" />
              <span>Pay ${(amount / 100).toFixed(2)}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export default function PaymentModal({ isOpen, onClose, onPaymentSuccess, amount }: PaymentModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Complete Your Purchase
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Video Editing Service</span>
              <span className="font-semibold text-gray-900">
                ${(amount / 100).toFixed(2)}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              AI-powered video editing with recommended cuts
            </p>
          </div>

          <Elements stripe={stripePromise}>
            <CheckoutForm
              onPaymentSuccess={onPaymentSuccess}
              onClose={onClose}
              amount={amount}
            />
          </Elements>
        </div>
      </div>
    </div>
  );
}