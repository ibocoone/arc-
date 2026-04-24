import { BrowserProvider } from 'ethers';

export const ARC_TESTNET = {
  chainId: '0x4CE162', // 5042002
  chainIdDecimal: 5042002,
  chainName: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: ['https://rpc.testnet.arc.network'],
  blockExplorerUrls: ['https://testnet.arcscan.app'],
};

export async function switchToArcTestnet() {
  if (!window.ethereum) return;
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: ARC_TESTNET.chainId }],
    });
  } catch (err: any) {
    if (err.code === 4902) {
      // Add the chain — only pass MetaMask-accepted fields
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: ARC_TESTNET.chainId,
          chainName: ARC_TESTNET.chainName,
          nativeCurrency: ARC_TESTNET.nativeCurrency,
          rpcUrls: ARC_TESTNET.rpcUrls,
          blockExplorerUrls: ARC_TESTNET.blockExplorerUrls,
        }],
      });
    } else {
      throw err;
    }
  }
}

export async function getChainId(): Promise<number | null> {
  if (!window.ethereum) return null;
  const chainId = await window.ethereum.request({ method: 'eth_chainId' });
  return parseInt(chainId, 16);
}

export async function connectWallet(): Promise<string> {
  if (!window.ethereum) throw new Error("No wallet detected. Please install MetaMask.");

  // Auto-switch to Arc Testnet
  await switchToArcTestnet();

  const provider = new BrowserProvider(window.ethereum);
  const accounts = await provider.send("eth_requestAccounts", []);
  return accounts[0] as string;
}

export async function getWalletAddress(): Promise<string | null> {
  if (!window.ethereum) return null;
  const provider = new BrowserProvider(window.ethereum);
  const accounts = await provider.send("eth_accounts", []);
  return accounts[0] || null;
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
