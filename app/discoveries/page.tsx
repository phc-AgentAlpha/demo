import { getDiscoveries } from '@/lib/indexer/mock-indexer';
import { DiscoveriesClient } from '@/components/DiscoveriesClient';

export default function DiscoveriesPage() {
  const discoveries = getDiscoveries();
  return <DiscoveriesClient discoveries={discoveries} />;
}
