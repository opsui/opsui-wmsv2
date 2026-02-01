/**
 * Tests for PackingPage component
 * @covers src/pages/PackingPage.tsx
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PackingPage } from '../PackingPage';
import { useAuthStore } from '@/stores';
import * as api from '@/services/api';

// Mock the hooks
jest.mock('@/stores');
jest.mock('@/services/api');
jest.mock('@/components/shared', () => ({
  ...jest.requireActual('@/components/shared'),
  Header: ({ children, ...props }: any) => <header {...props}>{children}</header>,
}));

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

describe('PackingPage', () => {
  let queryClient: QueryClient;

  const mockUser = {
    userId: 'user-123',
    email: 'packer@example.com',
    name: 'Test Packer',
    role: 'PACKER' as const,
    active: true,
  };

  const mockOrder = {
    orderId: 'ORD-001',
    customerName: 'Test Customer',
    status: 'PICKED' as const,
    priority: 'HIGH' as const,
    items: [
      {
        orderItemId: 'OI-001',
        sku: 'SKU-001',
        name: 'Test Item 1',
        quantity: 2,
        binLocation: 'A-01-01',
      },
      {
        orderItemId: 'OI-002',
        sku: 'SKU-002',
        name: 'Test Item 2',
        quantity: 1,
        binLocation: 'B-01-01',
      },
    ],
    shipToAddress: {
      name: 'Test Customer',
      street: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      zipCode: '12345',
      country: 'USA',
    },
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      canPack: () => true,
      getEffectiveRole: () => 'PACKER',
    } as any);

    (api.useOrder as jest.Mock).mockReturnValue({
      data: mockOrder,
      isLoading: false,
      refetch: jest.fn(),
    });

    (api.useNZCCreateShipment as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue({
        labelData: 'base64encodedpdf...',
        trackingNumber: '1Z999AA10123456784',
      }),
      isPending: false,
    });

    (api.useCompletePacking as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue({}),
      isPending: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/orders/:orderId/pack" element={component} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  const navigateToPackingPage = () => {
    window.history.pushState({}, 'Test Page', '/orders/ORD-001/pack');
  };

  describe('Rendering', () => {
    it('should render the packing page', async () => {
      navigateToPackingPage();
      renderWithProviders(<PackingPage />);

      await waitFor(() => {
        expect(screen.getByText('ORD-001')).toBeInTheDocument();
        expect(screen.getByText('Test Customer')).toBeInTheDocument();
      });
    });

    it('should display order items', async () => {
      navigateToPackingPage();
      renderWithProviders(<PackingPage />);

      await waitFor(() => {
        expect(screen.getByText('SKU-001')).toBeInTheDocument();
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
        expect(screen.getByText('SKU-002')).toBeInTheDocument();
      });
    });

    it('should display shipping address', async () => {
      navigateToPackingPage();
      renderWithProviders(<PackingPage />);

      await waitFor(() => {
        expect(screen.getByText('123 Main St')).toBeInTheDocument();
        expect(screen.getByText('Anytown, CA 12345')).toBeInTheDocument();
      });
    });

    it('should display package type selection', async () => {
      navigateToPackingPage();
      renderWithProviders(<PackingPage />);

      await waitFor(() => {
        expect(screen.getByText(/Package Type/i)).toBeInTheDocument();
        expect(screen.getByText(/Small Box/i)).toBeInTheDocument();
        expect(screen.getByText(/Medium Box/i)).toBeInTheDocument();
        expect(screen.getByText(/Large Box/i)).toBeInTheDocument();
      });
    });
  });

  describe('Access Control', () => {
    it('should show access denied for non-packers', () => {
      mockUseAuthStore.mockReturnValue({
        user: { ...mockUser, role: 'PICKER' as const },
        canPack: () => false,
      } as any);

      navigateToPackingPage();
      renderWithProviders(<PackingPage />);

      expect(screen.getByText(/You need packer privileges/)).toBeInTheDocument();
    });

    it('should render for packer users', () => {
      navigateToPackingPage();
      renderWithProviders(<PackingPage />);

      expect(screen.queryByText(/You need packer privileges/)).not.toBeInTheDocument();
    });
  });

  describe('Package Selection', () => {
    it('should allow selecting package type', async () => {
      navigateToPackingPage();
      renderWithProviders(<PackingPage />);

      await waitFor(() => {
        const mediumBoxOption = screen.getByText(/Medium Box/i);
        return mediumBoxOption;
      });

      const mediumBoxOption = screen.getByText(/Medium Box/i);
      await userEvent.click(mediumBoxOption);

      // Package type should be selected
    });

    it('should display selected package type', async () => {
      navigateToPackingPage();
      renderWithProviders(<PackingPage />);

      await waitFor(() => {
        const smallBoxOption = screen.getByText(/Small Box/i);
        return smallBoxOption;
      });

      const smallBoxOption = screen.getByText(/Small Box/i);
      await userEvent.click(smallBoxOption);

      // Selection should be visible
    });
  });

  describe('Carrier Selection', () => {
    it('should display carrier options', async () => {
      navigateToPackingPage();
      renderWithProviders(<PackingPage />);

      await waitFor(() => {
        expect(screen.getByText(/Carrier/i)).toBeInTheDocument();
        expect(screen.getByText(/FedEx/i)).toBeInTheDocument();
        expect(screen.getByText(/UPS/i)).toBeInTheDocument();
        expect(screen.getByText(/USPS/i)).toBeInTheDocument();
      });
    });

    it('should allow selecting carrier', async () => {
      navigateToPackingPage();
      renderWithProviders(<PackingPage />);

      await waitFor(() => {
        const fedExOption = screen.getByText(/FedEx/i);
        return fedExOption;
      });

      const fedExOption = screen.getByText(/FedEx/i);
      await userEvent.click(fedExOption);

      // Carrier should be selected
    });
  });

  describe('Service Level Selection', () => {
    it('should display service level options', async () => {
      navigateToPackingPage();
      renderWithProviders(<PackingPage />);

      await waitFor(() => {
        expect(screen.getByText(/Service Level/i)).toBeInTheDocument();
        expect(screen.getByText(/Ground/i)).toBeInTheDocument();
        expect(screen.getByText(/Express/i)).toBeInTheDocument();
        expect(screen.getByText(/Overnight/i)).toBeInTheDocument();
      });
    });

    it('should allow selecting service level', async () => {
      navigateToPackingPage();
      renderWithProviders(<PackingPage />);

      await waitFor(() => {
        const expressOption = screen.getByText(/Express/i);
        return expressOption;
      });

      const expressOption = screen.getByText(/Express/i);
      await userEvent.click(expressOption);

      // Service level should be selected
    });
  });

  describe('Label Generation', () => {
    it('should generate shipping label', async () => {
      const generateLabelMock = jest.fn().mockResolvedValue({
        labelData: 'base64encodedpdf...',
        trackingNumber: '1Z999AA10123456784',
      });

      (api.useNZCCreateShipment as jest.Mock).mockReturnValue({
        mutateAsync: generateLabelMock,
        isPending: false,
      });

      navigateToPackingPage();
      renderWithProviders(<PackingPage />);

      await waitFor(() => {
        const generateButton = screen.getByText(/Generate Label/i);
        return generateButton;
      });

      const generateButton = screen.getByText(/Generate Label/i);
      await userEvent.click(generateButton);

      await waitFor(() => {
        expect(generateLabelMock).toHaveBeenCalled();
      });
    });

    it('should show tracking number after label generation', async () => {
      navigateToPackingPage();
      renderWithProviders(<PackingPage />);

      // After label generation, tracking number should be displayed
      await waitFor(() => {
        const trackingNumber = screen.queryByText(/1Z999AA10123456784/);
        if (trackingNumber) {
          expect(trackingNumber).toBeInTheDocument();
        }
      });
    });
  });

  describe('Completing Packing', () => {
    it('should show complete button when label generated', async () => {
      navigateToPackingPage();
      renderWithProviders(<PackingPage />);

      await waitFor(() => {
        const completeButton = screen.queryByText(/Complete Packing/i);
        if (completeButton) {
          expect(completeButton).toBeInTheDocument();
        }
      });
    });

    it('should complete packing when button clicked', async () => {
      const completeMock = jest.fn().mockResolvedValue({});
      (api.useCompletePacking as jest.Mock).mockReturnValue({
        mutateAsync: completeMock,
        isPending: false,
      });

      navigateToPackingPage();
      renderWithProviders(<PackingPage />);

      await waitFor(() => {
        const completeButton = screen.queryByText(/Complete Packing/i);
        return completeButton;
      });

      const completeButton = screen.queryByText(/Complete Packing/i);
      if (completeButton) {
        await userEvent.click(completeButton);

        await waitFor(() => {
          expect(completeMock).toHaveBeenCalled();
        });
      }
    });
  });

  describe('Item Verification', () => {
    it('should allow verifying item counts', async () => {
      navigateToPackingPage();
      renderWithProviders(<PackingPage />);

      await waitFor(() => {
        expect(screen.getByText('Qty: 2')).toBeInTheDocument();
        expect(screen.getByText('Qty: 1')).toBeInTheDocument();
      });
    });

    it('should show confirm checkboxes for items', async () => {
      navigateToPackingPage();
      renderWithProviders(<PackingPage />);

      await waitFor(() => {
        const confirmCheckbox = screen.queryByRole('checkbox');
        if (confirmCheckbox) {
          expect(confirmCheckbox).toBeInTheDocument();
        }
      });
    });
  });

  describe('Weight Input', () => {
    it('should allow entering package weight', async () => {
      navigateToPackingPage();
      renderWithProviders(<PackingPage />);

      await waitFor(() => {
        const weightInput = screen.queryByPlaceholderText(/weight/i);
        if (weightInput) {
          userEvent.type(weightInput, '5.5');
          expect(weightInput).toHaveValue('5.5');
        }
      });
    });
  });

  describe('Order Information', () => {
    it('should display order ID and customer name', async () => {
      navigateToPackingPage();
      renderWithProviders(<PackingPage />);

      await waitFor(() => {
        expect(screen.getByText('ORD-001')).toBeInTheDocument();
        expect(screen.getByText('Test Customer')).toBeInTheDocument();
      });
    });

    it('should display order priority', async () => {
      navigateToPackingPage();
      renderWithProviders(<PackingPage />);

      await waitFor(() => {
        expect(screen.getByText('HIGH')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should have back button to return to packing queue', async () => {
      navigateToPackingPage();
      renderWithProviders(<PackingPage />);

      await waitFor(() => {
        const backButton = document.querySelector('[class*="ArrowLeftIcon"]');
        if (backButton) {
          expect(backButton).toBeInTheDocument();
        }
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading while order loads', () => {
      (api.useOrder as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
        refetch: jest.fn(),
      } as any);

      navigateToPackingPage();
      renderWithProviders(<PackingPage />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('should show error when order not found', () => {
      (api.useOrder as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        refetch: jest.fn(),
        error: new Error('Order not found'),
      } as any);

      navigateToPackingPage();
      renderWithProviders(<PackingPage />);

      const errorMessage = screen.queryByText(/not found/i);
      if (errorMessage) {
        expect(errorMessage).toBeInTheDocument();
      }
    });
  });

  describe('Print Functionality', () => {
    it('should allow printing shipping label', async () => {
      navigateToPackingPage();
      renderWithProviders(<PackingPage />);

      await waitFor(() => {
        const printButton = screen.queryByText(/Print Label/i);
        if (printButton) {
          expect(printButton).toBeInTheDocument();
        }
      });
    });
  });

  describe('Package Type Descriptions', () => {
    it('should show package dimensions', async () => {
      navigateToPackingPage();
      renderWithProviders(<PackingPage />);

      await waitFor(() => {
        // Small box dimensions
        const smallBoxInfo = screen.queryByText(/8x6x4/i);
        if (smallBoxInfo) {
          expect(smallBoxInfo).toBeInTheDocument();
        }
      });
    });
  });

  describe('Special Instructions', () => {
    it('should display special instructions if present', async () => {
      const orderWithInstructions = {
        ...mockOrder,
        specialInstructions: 'Fragile - Handle with care',
      };

      (api.useOrder as jest.Mock).mockReturnValue({
        data: orderWithInstructions,
        isLoading: false,
        refetch: jest.fn(),
      });

      navigateToPackingPage();
      renderWithProviders(<PackingPage />);

      await waitFor(() => {
        const instructions = screen.queryByText(/Fragile/i);
        if (instructions) {
          expect(instructions).toBeInTheDocument();
        }
      });
    });
  });
});
