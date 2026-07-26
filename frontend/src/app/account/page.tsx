import { redirect } from 'next/navigation';

export default function AccountHomePage() {
  redirect('/account/orders');
}
