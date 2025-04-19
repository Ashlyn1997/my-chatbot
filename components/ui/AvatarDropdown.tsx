import React, { useState } from "react";

export default function AvatarDropdown() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleLogout = () => {
    console.log("用户已退出登录");
    // 在这里实现退出逻辑，例如清除 token 或跳转到登录页
  };

  return (
    <div className="relative inline-block">
      {/* 头像 */}
      <div
        className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center cursor-pointer relative overflow-hidden"
        onClick={toggleDropdown}
      >
        {/* 水涟漪动画 */}

        {/* 初始头像内容 */}
        <span className="text-white font-bold text-xl">A</span>
      </div>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
          <div className="py-2">
            {/* 查看登录人信息 */}
            <button
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => console.log("查看登录人信息")}
            >
              查看登录人信息
            </button>
            {/* 退出按钮 */}
            <button
              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
              onClick={handleLogout}
            >
              退出
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

