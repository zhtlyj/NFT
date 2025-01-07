"use client";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { notification } from "antd";
import { useRouter } from "next/navigation";

// 添加接口定义
interface NftInfo {
  image: string;
  id: number;
  name: string;
  attributes: { trait_type: string; value: string }[];
  owner: string;
  price: string;
  description: string;
  Shelves: number;
  PurchasePrice: string;
  CID?: string;
  isListed: boolean;
}

interface MyHoldingsProps {
  filteredNFTs: NftInfo[];
}

export const MyHoldings = ({ filteredNFTs }: MyHoldingsProps) => {
  const { address: connectedAddress } = useAccount();
  const [isListed, setIsListed] = useState<{ [key: number]: boolean }>({});
  const [listingPrice, setListingPrice] = useState<{ [key: number]: string }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  // 重置所有状态
  const resetStates = () => {
    setIsListed({});
    setListingPrice({});
    setCurrentPage(1);
  };

  // 初始化状态
  useEffect(() => {
    resetStates();
    
    const initialListedState: { [key: number]: boolean } = {};
    const initialPriceState: { [key: number]: string } = {};
    
    filteredNFTs.forEach(nft => {
      initialListedState[nft.id] = nft.Shelves === 1;
      initialPriceState[nft.id] = nft.PurchasePrice;
    });
    
    setIsListed(initialListedState);
    setListingPrice(initialPriceState);

  }, [filteredNFTs, connectedAddress]); // 添加 connectedAddress 作为依赖

  // 计算当前页面显示的 NFTs
  const currentNFTs = filteredNFTs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredNFTs.length / itemsPerPage);

  // 处理上架/下架
  const handleListToggle = async (checked: boolean, nft: NftInfo) => {
    try {
      if (checked && !listingPrice[nft.id]) {
        notification.error({ message: "请设置价格" });
        return;
      }

      console.log('准备更新NFT状态:', {
        id: nft.id,
        isListed: checked,
        price: checked ? listingPrice[nft.id] : '',
        owner: nft.owner
      });

      // 发送更新请求到数据库
      const response = await fetch('/api/Nft', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: nft.id,
          isListed: checked,
          price: checked ? listingPrice[nft.id] : '',
          owner: nft.owner
        }),
      });

      const data = await response.json();
      console.log('服务器响应:', data);

      if (!response.ok) {
        throw new Error(data.message || '操作失败');
      }

      // 更新本地状态
      setIsListed(prev => ({ ...prev, [nft.id]: checked }));
      
      notification.success({
        message: checked ? '上架成功' : '下架成功',
        description: checked 
          ? `NFT #${nft.id} 已上架，价格: ${listingPrice[nft.id]} ETH`
          : `NFT #${nft.id} 已下架`
      });

    } catch (error) {
      console.error('操作失败:', error);
      notification.error({
        message: checked ? '上架失败 ' : '下架失败',
        description: error instanceof Error ? error.message : '未知错误'
      });
      // 恢复之前的状态
      setIsListed(prev => ({ ...prev, [nft.id]: !checked }));
    }
  };

  const handlePriceChange = (id: number, value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setListingPrice(prev => ({ ...prev, [id]: value }));
    }
  };

  if (!connectedAddress) {
    return (
      <div className="text-center py-8 text-gray-400">
        请先连接钱包
      </div>
    );
  }

  return (
    <div>
      {/* NFT网格布局 - 减小间距 */}
      <div className="grid grid-cols-2 gap-4">
        {currentNFTs.map((nft, index) => (
          <div 
            key={index}
            className="bg-[#231564] rounded-lg overflow-hidden border border-[#3d2b85]"
          >
            {/* NFT图片 */}
            <div 
              className="aspect-square relative cursor-pointer" 
              onClick={() => handleNFTClick(nft.id)}
            >
              <img
                src={nft.image}
                alt={nft.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* NFT信息 */}
            <div className="p-3">
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-base font-bold text-white">{nft.name}</h3>
                <button
                  onClick={() => handleNFTClick(nft.id)}
                  disabled={true}
                  className="px-2 py-1 text-xs bg-gray-500 cursor-not-allowed text-white rounded-md transition-colors"
                >
                  3D展厅
                </button>
              </div>
              
              <p className="text-gray-400 text-xs mb-2 line-clamp-2">{nft.description}</p>
              <div className="flex justify-between items-center mb-3">
                <span className="text-purple-400 text-sm">{formatPrice(nft.price)} ETH</span>
                <div className="px-2 py-0.5 rounded-full bg-[#1a1147] text-purple-400 text-xs">
                  {nft.attributes[0]?.value}
                </div>
              </div>

              {/* 上架控制 - 减小间距 */}
              <div className="flex items-center gap-2 pt-3 border-t border-[#3d2b85]">
                <div className="flex items-center gap-1">
                  <span className="text-gray-400 text-xs">上架</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={isListed[nft.id] || false}
                      onChange={(e) => handleListToggle(e.target.checked, nft)}
                    />
                    <div className="w-8 h-4 bg-[#1a1147] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-500"></div>
                  </label>
                </div>
                <input
                  type="text"
                  value={listingPrice[nft.id] || ""}
                  onChange={(e) => setListingPrice(prev => ({ ...prev, [nft.id]: e.target.value }))}
                  placeholder="Price in ETH"
                  disabled={isListed[nft.id]}
                  className="flex-1 bg-[#1a1147] border border-[#3d2b85] rounded-md px-2 py-0.5 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 分页控制 - 减小间距和按钮大小 */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-4 gap-1">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className={`px-2 py-0.5 rounded-md text-xs ${
              currentPage === 1
                ? 'bg-[#1a1147] text-gray-500 cursor-not-allowed'
                : 'bg-[#231564] text-white hover:bg-purple-500 transition-colors'
            }`}
          >
            Previous
          </button>
          
          {[...Array(totalPages)].map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentPage(index + 1)}
              className={`px-2 py-0.5 rounded-md text-xs ${
                currentPage === index + 1
                  ? 'bg-purple-500 text-white'
                  : 'bg-[#231564] text-white hover:bg-purple-500 transition-colors'
              }`}
            >
              {index + 1}
            </button>
          ))}
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className={`px-2 py-0.5 rounded-md text-xs ${
              currentPage === totalPages
                ? 'bg-[#1a1147] text-gray-500 cursor-not-allowed'
                : 'bg-[#231564] text-white hover:bg-purple-500 transition-colors'
            }`}
          >
            Next
          </button>
        </div>
      )}

      {filteredNFTs.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          暂无NFT
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            {currentNFTs.map(nft => (
              <div 
                key={`nft-${nft.id}-${connectedAddress}`}
                className="bg-[#231564] rounded-lg overflow-hidden border border-[#3d2b85]"
              >
                <div className="aspect-square relative">
                  <img
                    src={nft.image}
                    alt={nft.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="p-3">
                  <h3 className="text-base font-bold text-white">{nft.name}</h3>
                  <p className="text-gray-400 text-xs mb-2 line-clamp-2">{nft.description}</p>
                  
                  <div className="flex items-center gap-2 pt-3 border-t border-[#3d2b85]">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400 text-xs">上架</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={isListed[nft.id] || false}
                          onChange={(e) => handleListToggle(e.target.checked, nft.id)}
                        />
                        <div className="w-8 h-4 bg-[#1a1147] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-500"></div>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={listingPrice[nft.id] || ""}
                      onChange={(e) => handlePriceChange(nft.id, e.target.value)}
                      placeholder="Price in ETH"
                      disabled={isListed[nft.id]}
                      className="flex-1 bg-[#1a1147] border border-[#3d2b85] rounded-md px-2 py-0.5 text-white text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center mt-4 gap-1">
              {Array.from({ length: totalPages }).map((_, index) => (
                <button
                  key={`page-${index + 1}`}
                  onClick={() => setCurrentPage(index + 1)}
                  className={`px-3 py-1 rounded-md text-sm ${
                    currentPage === index + 1
                      ? 'bg-purple-500 text-white'
                      : 'bg-[#231564] text-white hover:bg-purple-500'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
