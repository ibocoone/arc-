import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { connectWallet, getWalletAddress, getChainId, switchToArcTestnet, shortenAddress, ARC_TESTNET } from '../lib/wallet';

interface UserData {
  uid: string;
  address: string;
  displayName: string;
  balance: number;
}

interface UserContextType {
  user: { uid: string; address: string } | null;
  userData: UserData | null;
  loading: boolean;
  error: string | null;
  isWrongNetwork: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: null, userData: null, loading: false, error: null, isWrongNetwork: false,
  connect: async () => {}, disconnect: () => {}, switchNetwork: async () => {}
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ uid: string; address: string } | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);
  const unsubRef = useRef<(() => void) | null>(null);

  const initUser = (address: string) => {
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }

    const uid = address.toLowerCase();
    setUser({ uid, address });
    setError(null);

    const userDocRef = doc(db, 'users', uid);
    const unsub = onSnapshot(
      userDocRef,
      (snap) => {
        if (snap.exists()) {
          setUserData(snap.data() as UserData);
        } else {
          // Doc doesn't exist yet — server creates it on first order
          // Show default 10k balance in UI
          setUserData({ uid, address, displayName: shortenAddress(address), balance: 10000 });
        }
        setLoading(false);
      },
      (err) => {
        console.error('Firestore error:', err);
        setLoading(false); // ← also stop loading on error
      }
    );
    unsubRef.current = unsub;
  };

  const clearUser = () => {
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
    setUser(null);
    setUserData(null);
    setLoading(false);
    setError(null);
  };

  // On mount: auto-reconnect if wallet was already connected
  useEffect(() => {
    // Check network on mount
    getChainId().then(chainId => {
      if (chainId && chainId !== ARC_TESTNET.chainIdDecimal) setIsWrongNetwork(true);
    });

    getWalletAddress().then((address) => {
      if (address) initUser(address);
    }).catch(() => {});

    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) clearUser();
      else initUser(accounts[0]);
    };

    const handleChainChanged = (chainId: string) => {
      const id = parseInt(chainId, 16);
      setIsWrongNetwork(id !== ARC_TESTNET.chainIdDecimal);
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
      if (unsubRef.current) unsubRef.current();
    };
  }, []);

  const connect = async () => {
    if (!window.ethereum) {
      setError('No wallet detected. Please install MetaMask.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const address = await connectWallet();
      setIsWrongNetwork(false);
      initUser(address);
    } catch (err: any) {
      setLoading(false);
      if (err.code === 4001 || err.message?.includes('rejected')) {
        setError('Connection rejected.');
      } else {
        setError(err.message || 'Failed to connect wallet');
      }
    }
  };

  const switchNetwork = async () => {
    try {
      await switchToArcTestnet();
      setIsWrongNetwork(false);
    } catch (err: any) {
      setError('Failed to switch network');
    }
  };

  const disconnect = () => clearUser();

  return (
    <UserContext.Provider value={{ user, userData, loading, error, isWrongNetwork, connect, disconnect, switchNetwork }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
