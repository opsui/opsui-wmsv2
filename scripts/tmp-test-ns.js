const {
  NetSuiteClient,
} = require('/root/opsui-wmsv2/packages/backend/dist/services/NetSuiteClient');

(async () => {
  const client = new NetSuiteClient({
    accountId: '7438866',
    tokenId: '4bfac4b650205db782d5ac1afbf1db70b6a36524b22b32280a35f3c28c030bb7',
    tokenSecret: '564d6e1d0372095c5474ab5841a927967393c37b456bb19fae8c5cbbc30e15b0',
    consumerKey: '1b5b7c6729175e166c0135fbee83901d429e7f87ceb99341f91374ec077e2170',
    consumerSecret: 'cce6b894d3d87b708e77b25dc1cef8bb5eb4146dede6c941738c083544f604c0',
  });

  const result = await client.testConnection();
  console.log(result);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
