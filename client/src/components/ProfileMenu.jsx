import {
  faCircleUser,
  faRightFromBracket,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { getCurrentUser, logout } from "../api/storageApi";

function ProfileMenu() {
  const [profile, setProfile] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const profileRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    let isCurrent = true;

    getCurrentUser()
      .then(({ user }) => {
        if (isCurrent) setProfile(user);
      })
      .catch((error) => {
        if (error.status === 401) {
          navigate("/login", { replace: true });
        } else {
          alert(error.message);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleOutsideClick = (event) => {
      if (!profileRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [isOpen]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="profile-control" ref={profileRef}>
      <button
        className="profile-button"
        type="button"
        title="Profile"
        aria-label="Profile"
        aria-expanded={isOpen}
        aria-controls="profile-menu"
        onClick={() => setIsOpen((open) => !open)}
      >
        <FontAwesomeIcon icon={faCircleUser} />
      </button>
      {isOpen && (
        <div className="profile-menu" id="profile-menu">
          <strong>{profile?.name || "Your account"}</strong>
          <span className="profile-email">
            {profile?.email || "Loading profile..."}
          </span>
          <div className="profile-divider" />
          <button
            className="profile-logout"
            type="button"
            onClick={handleLogout}
          >
            <FontAwesomeIcon icon={faRightFromBracket} />
            <span>Log out</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default ProfileMenu;
