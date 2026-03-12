import { NetSuiteClient } from '../NetSuiteClient';

jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('NetSuiteClient', () => {
  const credentials = {
    accountId: 'TEST_ACCOUNT',
    tokenId: 'token-id',
    tokenSecret: 'token-secret',
    consumerKey: 'consumer-key',
    consumerSecret: 'consumer-secret',
  };

  it('uses RecordRef search values when fetching fulfillments by sales order', async () => {
    const client = new NetSuiteClient(credentials);
    const soapRequest = jest
      .spyOn(client as any, 'soapRequest')
      .mockResolvedValue(`<?xml version="1.0" encoding="UTF-8"?>
        <searchResponse>
          <platformCore:status isSuccess="true" />
          <platformCore:totalRecords>1</platformCore:totalRecords>
          <recordList>
            <platformCore:record internalId="1602045" xsi:type="tranSales:ItemFulfillment">
              <tranId>IF73531</tranId>
              <createdFrom internalId="1599718">SO68381</createdFrom>
              <shipStatus>_picked</shipStatus>
            </platformCore:record>
          </recordList>
        </searchResponse>`);

    const results = await client.getItemFulfillmentsBySalesOrder(['1599718']);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(
      expect.objectContaining({
        tranId: 'IF73531',
        createdFrom: expect.objectContaining({ id: '1599718', refName: 'SO68381' }),
        shipStatus: '_picked',
      })
    );

    const [, envelope] = soapRequest.mock.calls[0];
    expect(envelope).toContain(
      '<platformCommon:createdFrom operator="anyOf" xsi:type="platformCore:SearchMultiSelectField">'
    );
    expect(envelope).toContain(
      '<platformCore:searchValue internalId="1599718" xsi:type="platformCore:RecordRef"/>'
    );
    expect(envelope).not.toContain('SearchBooleanField');
  });

  it('fetches all pages for item fulfillment searches', async () => {
    const client = new NetSuiteClient(credentials);
    const soapRequest = jest.spyOn(client as any, 'soapRequest');

    soapRequest
      .mockResolvedValueOnce(`<?xml version="1.0" encoding="UTF-8"?>
        <searchResponse>
          <platformCore:status isSuccess="true" />
          <platformCore:totalRecords>2</platformCore:totalRecords>
          <platformCore:totalPages>2</platformCore:totalPages>
          <platformCore:searchId>SEARCH-123</platformCore:searchId>
          <recordList>
            <record internalId="if-1" xsi:type="tranSales:ItemFulfillment">
              <tranId>IF-1</tranId>
              <createdFrom internalId="so-1">SO-1</createdFrom>
              <shipStatus>_picked</shipStatus>
            </record>
          </recordList>
        </searchResponse>`)
      .mockResolvedValueOnce(`<?xml version="1.0" encoding="UTF-8"?>
        <searchMoreWithIdResponse>
          <platformCore:status isSuccess="true" />
          <recordList>
            <record internalId="if-2" xsi:type="tranSales:ItemFulfillment">
              <tranId>IF-2</tranId>
              <createdFrom internalId="so-2">SO-2</createdFrom>
              <shipStatus>_packed</shipStatus>
            </record>
          </recordList>
        </searchMoreWithIdResponse>`);

    const results = await client.getItemFulfillments({ limit: 1000 });

    expect(results.items).toHaveLength(2);
    expect(results.items.map(item => item.tranId)).toEqual(['IF-1', 'IF-2']);
    expect(soapRequest.mock.calls[1][0]).toBe('searchMoreWithId');
  });

  it('uses caller-provided modifiedAfter when fetching item fulfillments', async () => {
    const client = new NetSuiteClient(credentials);
    const soapRequest = jest
      .spyOn(client as any, 'soapRequest')
      .mockResolvedValue(`<?xml version="1.0" encoding="UTF-8"?>
        <searchResponse>
          <platformCore:status isSuccess="true" />
          <platformCore:totalRecords>0</platformCore:totalRecords>
          <platformCore:totalPages>1</platformCore:totalPages>
          <recordList />
        </searchResponse>`);

    const modifiedAfter = new Date('2026-03-13T09:30:00.000Z');
    await client.getItemFulfillments({ limit: 1000, modifiedAfter });

    const [, envelope] = soapRequest.mock.calls[0];
    expect(envelope).toContain('<platformCommon:lastModifiedDate operator="after">');
    expect(envelope).toContain('2026-03-13T09:30:00.000Z');
  });
});
