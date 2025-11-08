import { useState } from 'react';
import { Button, Dropdown, Input, Menu } from 'antd';
import { SearchOutlined, DownOutlined } from '@ant-design/icons';
import styles from './SingerFilter.module.css';

const genreItems = [
  { key: '1', label: 'Pop' },
  { key: '2', label: 'Rock' },
  { key: '3', label: 'EDM' },
  { key: '4', label: 'R&B' },
  { key: '5', label: 'Hip-Hop' },
];

const languageItems = [
  { key: '1', label: 'English' },
  { key: '2', label: 'Spanish' },
  { key: '3', label: 'French' },
  { key: '4', label: 'German' },
];

const recommendedItems = [
  { key: '1', label: 'Recommended' },
  { key: '2', label: 'Most Reviews' },
  { key: '3', label: 'Newest' },
];

const SingerFilter = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleFilter = () => {
    setIsExpanded(!isExpanded);
  };

  const profileNameMenu = (
    <div className={styles.searchMenu}>
      <Input.Search
        placeholder="Search by name..."
        onSearch={value => console.log(value)}
        allowClear
      />
    </div>
  );

  return (
    <div className={styles.filterContainer}>
      <div className="row align-items-center">
        <div className="col">
          <div className={styles.filterWrapper}>
            {!isExpanded && (
              <Button
                type="text"
                onClick={toggleFilter}
                className={styles.filterTrigger}
              >
                Filters
              </Button>
            )}

            <div
              className={`${styles.expandedFilters} ${
                isExpanded ? styles.expanded : ''
              }`}
            >
              <Button
                type="text"
                onClick={toggleFilter}
                className={styles.filterTriggerActive}
              >
                Filters
              </Button>
              <div className={styles.filterItem}>
                <Input
                  placeholder="Sounds like..."
                  suffix={
                    <SearchOutlined style={{ color: 'rgba(0,0,0,.45)' }} />
                  }
                  variant="borderless"
                />
              </div>
              <div className={styles.filterItem}>
                <Dropdown menu={{ items: genreItems }}>
                  <Button type="text">
                    Genre <DownOutlined />
                  </Button>
                </Dropdown>
              </div>
              <div className={styles.filterItem}>
                <Button type="text">Online Now</Button>
              </div>
              <div className={styles.filterItem}>
                <Button type="text">SoundBetter Deal</Button>
              </div>
              <div className={styles.filterItem}>
                <Dropdown dropdownRender={() => profileNameMenu}>
                  <Button type="text">
                    Profile name <DownOutlined />
                  </Button>
                </Dropdown>
              </div>
              <div className={styles.filterItem}>
                <Dropdown menu={{ items: languageItems }}>
                  <Button type="text">
                    Language <DownOutlined />
                  </Button>
                </Dropdown>
              </div>
            </div>
          </div>
        </div>

        <div className="col-auto">
          <Dropdown menu={{ items: recommendedItems }}>
            <Button type="text" className={styles.sortButton}>
              Recommended <DownOutlined />
            </Button>
          </Dropdown>
        </div>
      </div>
    </div>
  );
};

export default SingerFilter;
