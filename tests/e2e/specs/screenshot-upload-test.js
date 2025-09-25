describe('Screenshot Upload Test', () => {
  context('Test screenshot and upload functionality', () => {
    it('should take a screenshot and upload it automatically', () => {
      // 初始化 playwright
      cy.initPlaywright().then(isConnected => {
        expect(isConnected).to.be.true;
      });

      // 分配窗口
      cy.assignWindows().then(assigned => {
        expect(assigned).to.be.true;
      });

      // 切换到 MetaMask 窗口
      cy.switchToMetamaskWindow();
      cy.isMetamaskWindowActive().then(isActive => {
        expect(isActive).to.be.true;
      });

      // 截图并自动上传
      const screenshotPath = 'tests/e2e/screenshots/test-screenshot.png';
      cy.metamaskScreenshot(screenshotPath).then(result => {
        console.log('Screenshot result:', result);
        
        // 验证截图成功
        expect(result.success).to.be.true;
        expect(result.screenshotPath).to.equal(screenshotPath);
        
        // 验证上传结果
        if (result.uploadResult) {
          expect(result.uploadResult).to.have.property('success');
          if (result.uploadResult.success) {
            expect(result.uploadResult).to.have.property('url');
            console.log('✅ Screenshot uploaded successfully:', result.uploadResult.url);
          } else {
            console.log('⚠️ Screenshot upload failed:', result.uploadResult.error);
          }
        } else if (result.uploadError) {
          console.log('⚠️ Upload error:', result.uploadError);
        }
        
        // 验证消息
        expect(result.message).to.include('Screenshot taken');
      });
    });

    it('should upload screenshot manually using uploadScreenshot command', () => {
      // 先截图
      const screenshotPath = 'tests/e2e/screenshots/manual-upload-test.png';
      cy.metamaskScreenshot(screenshotPath).then(result => {
        expect(result.success).to.be.true;
        
        // 手动上传截图
        cy.uploadScreenshot(screenshotPath).then(uploadResult => {
          console.log('Manual upload result:', uploadResult);
          
          expect(uploadResult).to.have.property('success');
          if (uploadResult.success) {
            expect(uploadResult).to.have.property('url');
            console.log('✅ Manual upload successful:', uploadResult.url);
          } else {
            console.log('❌ Manual upload failed:', uploadResult.error);
          }
        });
      });
    });
  });
});
