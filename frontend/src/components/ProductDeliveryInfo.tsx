'use client';

import { useEffect, useState } from 'react';
import { fetchShippingMethods, type ShippingMethod } from '@/lib/shipping';
import { formatDisplayPrice } from '@/lib/erpCatalog';

export default function ProductDeliveryInfo() {
  const [methods, setMethods] = useState<ShippingMethod[]>([]);

  useEffect(() => {
    fetchShippingMethods()
      .then(setMethods)
      .catch(() => setMethods([]));
  }, []);

  if (!methods.length) {
    return (
      <p className="text-[13px] text-gray-600 leading-relaxed">
        We deliver this piece to your address after a secure online payment. Delivery time is confirmed at checkout.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {methods.map((method) => (
        <li key={method.id} className="text-[13px] text-gray-600">
          <p className="font-semibold text-[#222]">{method.name}</p>
          <p>
            {method.eta ? `${method.eta} · ` : ''}
            {method.charge > 0 ? formatDisplayPrice(method.charge) : 'Free delivery'}
          </p>
        </li>
      ))}
      <li className="text-[13px] text-gray-600">
        Packed from Vijayawada and sent by courier. Tracking is emailed when the order ships.
      </li>
    </ul>
  );
}
