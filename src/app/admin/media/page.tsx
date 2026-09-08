import { MEDIA_CONTACTS } from '@/lib/media-outreach';
import MediaDirectory from './MediaDirectory';

export const dynamic = 'force-dynamic';

export default function AdminMediaPage() {
  return <MediaDirectory contacts={MEDIA_CONTACTS} asOf={new Date().toISOString()} />;
}
