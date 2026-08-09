export type ShippingAddress = {
  id?: string;
  pincode?: string;
  recipientName?: string;
  mobile?: string;
  altMobile?: string;
  addressLine?: string;
  street?: string;
  locality?: string;
  landmark?: string;
  city?: string;
  state?: string;
  country?: string;
  isDefault?: boolean;
};

export type WebsiteCustomer = {
  id: string;
  name: string;
  email: string;
  mobile: string;
  is_admin?: boolean;
  shippingAddress?: ShippingAddress | ShippingAddress[]; // Support legacy object and new array
};

async function parseJson(res: Response) {
  return res.json().catch(() => ({}));
}

export async function fetchMe(): Promise<WebsiteCustomer | null> {
  const res = await fetch('/api/auth/me', {
    credentials: 'include',
    cache: 'no-store',
  });
  if (res.status === 401) return null;
  const body = await parseJson(res);
  if (!res.ok) {
    throw new Error(body.error || 'Could not load account');
  }
  return body.data as WebsiteCustomer;
}

export async function updateMe(input: {
  name?: string;
  mobile?: string;
  shippingAddress?: ShippingAddress | ShippingAddress[];
}) {
  const res = await fetch('/api/auth/me', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body = await parseJson(res);
  if (!res.ok) {
    throw new Error(body.error || 'Could not update profile');
  }
  return body.data as WebsiteCustomer;
}

export async function signupAccount(input: {
  name: string;
  email: string;
  mobile: string;
  password: string;
}) {
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body = await parseJson(res);
  if (!res.ok) {
    throw new Error(body.error || 'Sign up failed');
  }
  return body.data as WebsiteCustomer;
}

export async function loginAccount(input: { email: string; password: string }) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body = await parseJson(res);
  if (!res.ok) {
    throw new Error(body.error || 'Sign in failed');
  }
  return body.data as WebsiteCustomer;
}

export async function logoutAccount() {
  const res = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
  const body = await parseJson(res);
  if (!res.ok) {
    throw new Error(body.error || 'Sign out failed');
  }
}
