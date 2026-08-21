import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, Coins, ExternalLink, Lock, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { fadeInUp, staggerContainer } from '../lib/animations';
import { useLayoutContext } from '../Layout';
import { supabase } from '../lib/supabase';

interface Profile {
  tier: 'free' | 'producer' | 'ultimate';
  credits: number;
  stripe_customer_id: string | null;
}

const TIER_LABEL: Record<Profile['tier'], string> = {
  free: 'Free',
  producer: 'Producer Pack',
  ultimate: 'Ultimate Pack',
};

export function Account() {
  const { user, requestAuth } = useLayoutContext();
  const [searchParams] = useSearchParams();
  const checkoutSuccess = searchParams.get('checkout') === 'success';
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoadingProfile(false);
      return;
    }

    let cancelled = false;
    setLoadingProfile(true);

    supabase
      .from('profiles')
      .select('tier, credits, stripe_customer_id')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('Failed to load profile:', error);
        } else {
          setProfile(data as Profile);
        }
        setLoadingProfile(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleManageSubscription = async () => {
    setPortalError(null);
    setOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session', {});

      if (error) {
        const status = (error as any)?.context?.status as number | undefined;
        let detail: { error?: string; message?: string } = {};
        try {
          detail = (await (error as any)?.context?.json?.()) ?? {};
        } catch {
          // corp non-JSON
        }

        if (status === 503 || detail.error === 'portal_not_configured') {
          setPortalError('Subscription management isn\'t set up yet — check back soon.');
        } else if (status === 404 || detail.error === 'no_subscription') {
          setPortalError('No active subscription found on this account.');
        } else {
          setPortalError(detail.message ?? 'Could not open subscription management right now.');
        }
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        setPortalError('Could not open subscription management right now.');
      }
    } catch (err) {
      console.error('create-portal-session failed:', err);
      setPortalError('Could not open subscription management right now.');
    } finally {
      setOpeningPortal(false);
    }
  };

  // Neautentificat: nu redirectăm automat, ca userul să nu piardă contextul
  // paginii — îi cerem direct să se autentifice, aici.
  if (!user) {
    return (
      <header className="page-intro">
        <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
          <motion.div variants={fadeInUp} className="account-lock-icon">
            <Lock size={28} />
          </motion.div>
          <motion.h1 className="page-title" variants={fadeInUp}>
            Account <span className="glow-text">Settings</span>
          </motion.h1>
          <motion.p className="page-subtitle" variants={fadeInUp}>
            Sign in to view your plan and manage your subscription.
          </motion.p>
          <motion.div variants={fadeInUp} style={{ marginTop: 28 }}>
            <button onClick={requestAuth} className="btn btn-primary">
              Sign In
            </button>
          </motion.div>
        </motion.div>
      </header>
    );
  }

  const isPaid = profile?.tier === 'producer' || profile?.tier === 'ultimate';

  return (
    <>
      <header className="page-intro">
        <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
          <motion.h1 className="page-title" variants={fadeInUp}>
            Account <span className="glow-text">Settings</span>
          </motion.h1>
          <motion.p className="page-subtitle" variants={fadeInUp}>
            {user.email}
          </motion.p>
        </motion.div>
      </header>

      <section className="account-section">
        {checkoutSuccess && (
          <motion.div
            className="account-success"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <CheckCircle2 size={16} />
            <span>Payment received! It may take a few seconds to show up below.</span>
          </motion.div>
        )}

        <motion.div
          className="account-card glass"
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
        >
          <div className="account-card-header">
            <div className="account-card-icon">
              <Crown size={22} />
            </div>
            <div>
              <h2>Subscription</h2>
              <p>Your current plan and credits.</p>
            </div>
          </div>

          {loadingProfile ? (
            <div className="account-loading">
              <Loader2 size={18} className="spin" /> Loading your plan…
            </div>
          ) : (
            <>
              <div className="account-stats">
                <div className="account-stat">
                  <span className="account-stat-label">Current plan</span>
                  <span className="account-stat-value">
                    {profile ? TIER_LABEL[profile.tier] : '—'}
                  </span>
                </div>
                <div className="account-stat">
                  <span className="account-stat-label">Credits</span>
                  <span className="account-stat-value account-stat-credits">
                    {profile?.tier === 'ultimate' ? (
                      'Unlimited'
                    ) : (
                      <>
                        <Coins size={16} /> {profile?.credits ?? 0}
                      </>
                    )}
                  </span>
                </div>
              </div>

              {portalError && (
                <div className="account-error">
                  <AlertCircle size={16} />
                  <span>{portalError}</span>
                </div>
              )}

              <div className="account-actions">
                {isPaid && profile?.stripe_customer_id ? (
                  <button
                    onClick={handleManageSubscription}
                    disabled={openingPortal}
                    className="btn btn-primary"
                  >
                    {openingPortal ? (
                      <Loader2 size={16} className="spin" />
                    ) : (
                      <ExternalLink size={16} />
                    )}
                    Manage Subscription
                  </button>
                ) : (
                  <>
                    <p className="account-upgrade-hint">
                      You're on the Free plan. Upgrade for unlimited downloads and the AI generator.
                    </p>
                    <Link to="/pricing" className="btn btn-secondary glass-btn">
                      Upgrade Plan
                    </Link>
                  </>
                )}
              </div>
            </>
          )}
        </motion.div>
      </section>
    </>
  );
}
