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
    const soapRequest = jest.spyOn(client as any, 'soapRequest')
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

    soapRequest.mockResolvedValueOnce(`<?xml version="1.0" encoding="UTF-8"?>
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
        </searchResponse>`).mockResolvedValueOnce(`<?xml version="1.0" encoding="UTF-8"?>
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
    const soapRequest = jest.spyOn(client as any, 'soapRequest')
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

  it('falls back to kitItem when fetching item details for NetSuite kit records', async () => {
    const client = new NetSuiteClient(credentials);
    const soapRequest = jest.spyOn(client as any, 'soapRequest');

    soapRequest.mockResolvedValueOnce(`<?xml version="1.0" encoding="UTF-8"?>
        <getResponse>
          <platformCore:status isSuccess="false" />
          <platformCore:faultstring>The record you are attempting to load has a different type: kititem from the type specified: inventoryitem.</platformCore:faultstring>
        </getResponse>`).mockResolvedValueOnce(`<?xml version="1.0" encoding="UTF-8"?>
        <getResponse>
          <platformCore:status isSuccess="false" />
          <platformCore:faultstring>The record you are attempting to load has a different type: kititem from the type specified: assemblyitem.</platformCore:faultstring>
        </getResponse>`).mockResolvedValueOnce(`<?xml version="1.0" encoding="UTF-8"?>
        <getResponse>
          <platformCore:status isSuccess="true" />
          <record internalId="3223" xsi:type="listAcct:KitItem">
            <itemId>INFINITY GARAGE</itemId>
            <displayName>INFINITY GARAGE</displayName>
            <upcCode>9421036673999</upcCode>
            <preferredBinNumber>I1A</preferredBinNumber>
          </record>
        </getResponse>`);

    const item = await client.getInventoryItem('3223');

    expect(item).toEqual(
      expect.objectContaining({
        id: '3223',
        itemId: 'INFINITY GARAGE',
        displayName: 'INFINITY GARAGE',
        upcCode: '9421036673999',
        binNumber: 'I1A',
      })
    );
    expect(soapRequest).toHaveBeenCalledTimes(3);
    expect(soapRequest.mock.calls[2][1]).toContain('type="kitItem"');
  });

  it('uses InitializeRef and picked ship status when creating item fulfillments', async () => {
    const client = new NetSuiteClient(credentials);
    const soapRequest = jest.spyOn(client as any, 'soapRequest');

    soapRequest.mockResolvedValueOnce(`<?xml version="1.0" encoding="UTF-8"?>
        <initializeResponse>
          <platformCore:status isSuccess="true" />
          <record xsi:type="tranSales:ItemFulfillment">
            <tranSales:shipStatus>_picked</tranSales:shipStatus>
            <tranSales:itemList>
              <tranSales:item>
                <tranSales:itemReceive>false</tranSales:itemReceive>
                <tranSales:quantityRemaining>1</tranSales:quantityRemaining>
              </tranSales:item>
            </tranSales:itemList>
          </record>
        </initializeResponse>`).mockResolvedValueOnce(`<?xml version="1.0" encoding="UTF-8"?>
        <addResponse>
          <platformCore:status isSuccess="true" />
          <baseRef internalId="1609999" />
        </addResponse>`);

    const fulfillmentId = await client.createItemFulfillment('1604613', {});

    expect(fulfillmentId).toBe('1609999');

    const [, initializeEnvelope] = soapRequest.mock.calls[0];
    expect(initializeEnvelope).toContain('<tns:initializeRecord>');
    expect(initializeEnvelope).toContain(
      '<platformCore:reference xsi:type="platformCore:InitializeRef" type="salesOrder" internalId="1604613"/>'
    );

    const [, addEnvelope] = soapRequest.mock.calls[1] as [string, string];
    expect(addEnvelope).toContain('<tranSales:itemReceive>true</tranSales:itemReceive>');
    expect(addEnvelope).toContain('<tranSales:shipStatus>_picked</tranSales:shipStatus>');
  });

  it('updates item fulfillments to shipped with a package tracking number', async () => {
    const client = new NetSuiteClient(credentials);
    const soapRequest = jest.spyOn(client as any, 'soapRequest');

    soapRequest.mockResolvedValueOnce(`<?xml version="1.0" encoding="UTF-8"?>
        <getResponse>
          <platformCore:status isSuccess="true" />
          <record xsi:type="tranSales:ItemFulfillment" internalId="1609999">
            <tranSales:shipStatus>_packed</tranSales:shipStatus>
            <tranSales:packageList replaceAll="false">
              <tranSales:package>
                <tranSales:packageDescr>Old Carrier</tranSales:packageDescr>
              </tranSales:package>
            </tranSales:packageList>
          </record>
        </getResponse>`).mockResolvedValueOnce(`<?xml version="1.0" encoding="UTF-8"?>
        <updateResponse>
          <platformCore:status isSuccess="true" />
        </updateResponse>`);

    await client.updateItemFulfillmentShipment('1609999', {
      trackingNumber: 'BYAF038638',
      carrier: 'NZ Couriers',
      packageWeight: 2.5,
    });

    const [, updateEnvelope] = soapRequest.mock.calls[1];
    expect(updateEnvelope).toContain('<tranSales:shipStatus>_shipped</tranSales:shipStatus>');
    expect(updateEnvelope).toContain(
      '<tranSales:packageTrackingNumber>BYAF038638</tranSales:packageTrackingNumber>'
    );
    expect(updateEnvelope).toContain(
      '<tranSales:packageDescr>NZ Couriers</tranSales:packageDescr>'
    );
    expect(updateEnvelope).toContain('<tranSales:packageWeight>2.5</tranSales:packageWeight>');
  });

  it('only marks receivable fulfillment lines for receipt', async () => {
    const client = new NetSuiteClient(credentials);
    const soapRequest = jest.spyOn(client as any, 'soapRequest');

    soapRequest.mockResolvedValueOnce(`<?xml version="1.0" encoding="UTF-8"?>
        <initializeResponse>
          <platformCore:status isSuccess="true" />
          <record xsi:type="tranSales:ItemFulfillment">
            <tranSales:itemList>
              <tranSales:item>
                <tranSales:itemReceive>false</tranSales:itemReceive>
                <tranSales:quantityRemaining>1</tranSales:quantityRemaining>
              </tranSales:item>
              <tranSales:item>
                <tranSales:itemReceive>false</tranSales:itemReceive>
                <tranSales:quantityRemaining>0</tranSales:quantityRemaining>
              </tranSales:item>
            </tranSales:itemList>
          </record>
        </initializeResponse>`).mockResolvedValueOnce(`<?xml version="1.0" encoding="UTF-8"?>
        <addResponse>
          <platformCore:status isSuccess="true" />
          <baseRef internalId="1609998" />
        </addResponse>`);

    await client.createItemFulfillment('1604613', {});

    const [, addEnvelope] = soapRequest.mock.calls[1] as [string, string];
    expect(addEnvelope).toContain('<tranSales:quantityRemaining>1</tranSales:quantityRemaining>');
    expect(addEnvelope).toContain('<tranSales:itemReceive>true</tranSales:itemReceive>');
    expect(addEnvelope).toContain('<tranSales:quantityRemaining>0</tranSales:quantityRemaining>');
    expect(addEnvelope).toContain('<tranSales:itemReceive>false</tranSales:itemReceive>');
  });

  it('marks receivable fulfillment lines correctly when NetSuite line items contain nested item refs', async () => {
    const client = new NetSuiteClient(credentials);
    const soapRequest = jest.spyOn(client as any, 'soapRequest');

    soapRequest.mockResolvedValueOnce(`<?xml version="1.0" encoding="UTF-8"?>
        <initializeResponse>
          <platformCore:status isSuccess="true" />
          <record xsi:type="tranSales:ItemFulfillment">
            <tranSales:itemList>
              <tranSales:item>
                <tranSales:itemReceive>false</tranSales:itemReceive>
                <tranSales:itemName>EC-TOUCH W</tranSales:itemName>
                <tranSales:item internalId="2311">
                  <platformCore:name>EC-TOUCH W</platformCore:name>
                </tranSales:item>
                <tranSales:orderLine>1</tranSales:orderLine>
                <tranSales:quantityRemaining>1.0</tranSales:quantityRemaining>
              </tranSales:item>
              <tranSales:item>
                <tranSales:itemReceive>false</tranSales:itemReceive>
                <tranSales:itemName>EC-KIT KP W</tranSales:itemName>
                <tranSales:item internalId="3038">
                  <platformCore:name>EC-KIT KP W</platformCore:name>
                </tranSales:item>
                <tranSales:orderLine>15</tranSales:orderLine>
                <tranSales:quantityRemaining>1.0</tranSales:quantityRemaining>
              </tranSales:item>
            </tranSales:itemList>
          </record>
        </initializeResponse>`).mockResolvedValueOnce(`<?xml version="1.0" encoding="UTF-8"?>
        <addResponse>
          <platformCore:status isSuccess="true" />
          <baseRef internalId="1610001" />
        </addResponse>`);

    await client.createItemFulfillment('1605078', {});

    const [, addEnvelope] = soapRequest.mock.calls[1];
    expect(addEnvelope).toContain('<tranSales:orderLine>1</tranSales:orderLine>');
    expect(addEnvelope).toContain('<tranSales:orderLine>15</tranSales:orderLine>');

    const enabledReceives =
      String(addEnvelope).match(/<tranSales:itemReceive>true<\/tranSales:itemReceive>/g) || [];
    expect(enabledReceives).toHaveLength(2);
  });

  it('fails clearly when NetSuite initialize returns no receivable lines', async () => {
    const client = new NetSuiteClient(credentials);
    const soapRequest = jest.spyOn(client as any, 'soapRequest');

    soapRequest.mockResolvedValueOnce(`<?xml version="1.0" encoding="UTF-8"?>
      <initializeResponse>
        <platformCore:status isSuccess="true" />
        <record xsi:type="tranSales:ItemFulfillment">
          <tranSales:itemList>
            <tranSales:item>
              <tranSales:itemReceive>false</tranSales:itemReceive>
              <tranSales:quantityRemaining>0</tranSales:quantityRemaining>
            </tranSales:item>
          </tranSales:itemList>
        </record>
      </initializeResponse>`);

    await expect(client.createItemFulfillment('1604613', {})).rejects.toThrow(
      'no receivable fulfillment lines'
    );
    expect(soapRequest).toHaveBeenCalledTimes(1);
  });

  it('supports selecting a subset of fulfillment lines by order line', async () => {
    const client = new NetSuiteClient(credentials);
    const soapRequest = jest.spyOn(client as any, 'soapRequest');

    soapRequest.mockResolvedValueOnce(`<?xml version="1.0" encoding="UTF-8"?>
        <initializeResponse>
          <platformCore:status isSuccess="true" />
          <record xsi:type="tranSales:ItemFulfillment">
            <tranSales:itemList>
              <tranSales:item>
                <tranSales:itemReceive>false</tranSales:itemReceive>
                <tranSales:orderLine>1</tranSales:orderLine>
                <tranSales:quantityRemaining>2</tranSales:quantityRemaining>
              </tranSales:item>
              <tranSales:item>
                <tranSales:itemReceive>false</tranSales:itemReceive>
                <tranSales:orderLine>2</tranSales:orderLine>
                <tranSales:quantityRemaining>1</tranSales:quantityRemaining>
              </tranSales:item>
            </tranSales:itemList>
          </record>
        </initializeResponse>`).mockResolvedValueOnce(`<?xml version="1.0" encoding="UTF-8"?>
        <addResponse>
          <platformCore:status isSuccess="true" />
          <baseRef internalId="1609997" />
        </addResponse>`);

    await client.createItemFulfillment('1604613', {
      lines: [{ orderLine: 2, quantity: 1 }],
    });

    const [, addEnvelope] = soapRequest.mock.calls[1];
    expect(addEnvelope).toContain('<tranSales:orderLine>1</tranSales:orderLine>');
    expect(addEnvelope).toContain('<tranSales:orderLine>2</tranSales:orderLine>');
    expect(addEnvelope).toContain('<tranSales:quantity>1</tranSales:quantity>');
    expect(addEnvelope).toContain('<tranSales:itemReceive>true</tranSales:itemReceive>');
    expect(addEnvelope).toContain('<tranSales:itemReceive>false</tranSales:itemReceive>');
  });
});
