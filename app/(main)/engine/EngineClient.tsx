'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { RecommendationFeed } from '@/components/engine/RecommendationFeed';
import { FloatingAskButton } from '@/components/engine/FloatingAskButton';
import { NimaChatSheet } from '@/components/engine/NimaChatSheet';
import { AuthExpiredModal } from '@/components/auth';
import { trackEvent } from '@/lib/analytics';

interface EngineClientProps {
  authExpired?: boolean;
}

export default function EngineClient({ authExpired = false }: EngineClientProps) {
  const currentUser = useQuery(api.users.queries.getCurrentUser);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'new' | 'wardrobe'>('new');

  const handleOpenSheet = () => {
    trackEvent('ask_nima_button_tapped');
    setIsSheetOpen(true);
  };

  const handleSheetChange = (open: boolean) => {
    setIsSheetOpen(open);
  };

  return (
    <div className="relative flex flex-col h-dvh overflow-hidden bg-background">
      {authExpired && <AuthExpiredModal />}

      {/* Main recommendation feed */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <RecommendationFeed
          userName={currentUser?.firstName}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      {/* Floating "Ask Nima" button — hidden when sheet is open */}
      <FloatingAskButton isVisible={!isSheetOpen} onPress={handleOpenSheet} />

      {/* Chat bottom sheet */}
      <NimaChatSheet open={isSheetOpen} onOpenChange={handleSheetChange} />
    </div>
  );
}
